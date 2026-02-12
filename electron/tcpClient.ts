import { Socket } from "net";
import type {
  TcpConnectionConfig,
  TerminalCommand,
  TerminalResponse,
  TerminalCommandType,
} from "../shared/types.js";
import { DIRECT_TRADE_PORT } from "../shared/types.js";
import {
  encodeSignOnRequest,
  encodeFrame,
  decodeResponseMessage,
} from "./tlvCodec.js";

/**
 * Java Terminal Simulator와의 TCP 통신을 담당하는 클라이언트
 * port === DIRECT_TRADE_PORT(21000)일 때 TPS TLV 프로토콜 사용
 */
export class TcpClient {
  private socket: Socket | null = null;
  private config: TcpConnectionConfig;
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageBuffer: string = "";
  private responseBuffer: string[] = []; // 여러 줄 응답을 모으기 위한 버퍼
  private currentCommandType: TerminalCommandType | null = null; // 현재 실행 중인 명령 타입
  private tlvBuffer: Buffer = Buffer.alloc(0); // TLV 모드 시 length-prefixed 수신 버퍼

  constructor(config: TcpConnectionConfig) {
    this.config = config;
  }

  /**
   * TCP 서버에 연결
   */
  async connect(): Promise<void> {
    if (this.socket?.readyState === "open" || this.isConnecting) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;
      this.socket = new Socket();

      const timeout = setTimeout(() => {
        this.socket?.destroy();
        this.isConnecting = false;
        reject(new Error("Connection timeout"));
      }, this.config.timeout || 5000);

      this.socket.on("connect", () => {
        clearTimeout(timeout);
        this.isConnecting = false;
        this.clearReconnectTimer();
        console.log(`TCP Connected to ${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.socket.on("error", (error) => {
        clearTimeout(timeout);
        this.isConnecting = false;
        console.error("TCP Connection error:", error);
        reject(error);
        this.scheduleReconnect();
      });

      this.socket.on("close", () => {
        console.log("TCP Connection closed");
        this.socket = null;
        this.scheduleReconnect();
      });

      this.socket.on("data", (data) => {
        this.handleData(data);
      });

      this.socket.connect(this.config.port, this.config.host);
    });
  }

  /**
   * TCP 서버 연결 해제
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.tlvBuffer = Buffer.alloc(0);
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  private isTlvMode(): boolean {
    return this.config.port === DIRECT_TRADE_PORT;
  }

  /**
   * 역 이름을 영어 소문자로 변환 (config 파일 형식에 맞춤).
   * 매핑 실패 시 한글이 그대로 나가지 않도록 terminalId 기반으로만 fallback.
   */
  private getStationKey(station?: string): string {
    if (!station) return "";

    const stationMap: Record<string, string> = {
      서울역: "seoul",
      강남역: "gangnam_2line",
      종로3가역: "jongno3ga",
      신도림역: "sindorim_2line",
      홍대입구역: "hongdae",
      합정역: "hapjeong",
      시청: "sicheong",
      시청역: "sicheong",
      을지로3가: "euljiro3ga",
      을지로3가역: "euljiro3ga",
      한양대: "hanyangdae",
      교대: "gyodae",
      방배: "bangbae",
      도봉산역: "dobongsan",
      영등포역: "yeongdeungpo",
      "동대문역.흥인지문": "dongdaemun",
      장한평역3번출구: "janghanpyeong",
      "경희대의료원.경희여중고": "kyunghee",
      서대문문화체육회관입구: "seodaemun",
      가좌역3번출구: "gajwa",
      신당: "sindang",
      사당: "sadang",
      왕십리: "wangsimni",
      잠실: "jamsil",
      대림: "daerim",
    };

    const key = stationMap[station] ?? stationMap[station.trim()];
    if (key) return key;
    // 매핑 실패 시 한글을 그대로 반환하지 않음 (Java preset 키는 영문만 사용)
    return "";
  }

  /**
   * 단말기 타입을 기준으로 노선 구분(지하철/버스) 결정
   */
  private resolveTransitPrefix(command: TerminalCommand): "subway" | "bus" {
    if (command.transitType === "bus" || command.transitType === "subway") {
      return command.transitType;
    }
    const terminalId = command.terminalId || "";
    return terminalId.startsWith("B") ? "bus" : "subway";
  }

  /**
   * 명령어를 CLI 문자열로 변환
   */
  private commandToCliString(command: TerminalCommand): string {
    switch (command.type) {
      case "signon": {
        // presetKey가 있으면 signon-tps [preset] (Java TpsSignOnFunction에서 preset 지원)
        if (command.presetKey && String(command.presetKey).trim()) {
          return `signon-tps ${String(command.presetKey).trim()}`;
        }
        return "signon-tps";
      }
      case "signoff":
        return "signoff-tps";
      case "echo-test":
        return "echo-test-tps";
      case "sync": {
        // presetKey가 있으면 그대로 사용 (TerminalConfig.json journeyPresets 키와 일치)
        if (command.presetKey && String(command.presetKey).trim()) {
          return `sync-tms ${String(command.presetKey).trim()}`;
        }
        // 이하: presetKey 없을 때 기존 로직 (station/terminalId로 조합)
        const terminalId = command.terminalId || "";
        const terminalType = command.terminalType as
          | "entry"
          | "exit"
          | undefined;

        // 3·4호선 M3-*, M4-* terminalId → subway_3_in_xxx / subway_4_out_xxx
        const m34 = terminalId.match(/^M([34])-([A-Z0-9]+)-[EX]\d+$/);
        if (m34) {
          const lineNum = m34[1];
          const stem = m34[2].toLowerCase();
          const inOut = terminalId.includes("-E") ? "in" : "out";
          return `sync-tms subway_${lineNum}_${inOut}_${stem}`;
        }

        let stationKey = "";
        if (command.station) {
          const fromStation = this.getStationKey(command.station);
          if (fromStation && !/[\u0080-\uFFFF]/.test(fromStation)) stationKey = fromStation;
        }
        if (!stationKey && terminalId) {
          const match = terminalId.match(/^M-([A-Z0-9]+)-[EX]\d+$/);
          if (match) {
            const stationCode = match[1];
            const codeToName: Record<string, string> = {
              SEOUL: "seoul",
              GANGNAM: "gangnam",
              GANGNAM2: "gangnam_2line",
              JONGNO3GA: "jongno3ga",
              SINDORIM: "sindorim",
              SINDORIM2: "sindorim_2line",
              HONGDAE: "hongdae",
              HAPJEONG: "hapjeong",
              SICHEONG: "sicheong",
              EULJIRO3GA: "euljiro3ga",
              SINDANG: "sindang",
              SADANG: "sadang",
              WANGSIMNI: "wangsimni",
              JAMSIL: "jamsil",
              DAERIM: "daerim",
            };
            stationKey = codeToName[stationCode] || stationCode.toLowerCase();
          }
        }

        if (!stationKey) {
          throw new Error("Station information is required for sync command");
        }
        const transitPrefix = this.resolveTransitPrefix(command);

        const inOut =
          terminalType === "entry"
            ? "in"
            : terminalType === "exit"
            ? "out"
            : terminalId?.includes("-E")
            ? "in"
            : terminalId?.includes("-X")
            ? "out"
            : "in";

        return `sync-tms ${transitPrefix}_${inOut}_${stationKey}`;
      }
      case "card_tap": {
        // presetKey가 있으면 그대로 사용 (TerminalConfig.json journeyPresets 키와 일치)
        if (command.presetKey && String(command.presetKey).trim()) {
          return `authorization-tps ${String(command.presetKey).trim()}`;
        }
        // 이하: presetKey 없을 때 기존 로직 (지하철: station → terminalId로 cardStationKey 생성)
        const cardTerminalId = command.terminalId || "";
        const cardTerminalType = command.terminalType as
          | "entry"
          | "exit"
          | undefined;

        // 버스 단말은 presetKey 또는 journeyLog(JSON)로만 처리. CLI 폴백은 지하철 전용.
        if (cardTerminalId.startsWith("B-")) {
          throw new Error(
            "버스 카드 탭에는 노선·정류장 선택이 필요합니다. 정류장을 선택한 뒤 다시 시도해 주세요."
          );
        }

        // 3·4호선 M3-*, M4-* → subway_3_in_xxx / subway_4_out_xxx
        const cardM34 = cardTerminalId.match(/^M([34])-([A-Z0-9]+)-[EX]\d+$/);
        if (cardM34) {
          const lineNum = cardM34[1];
          const stem = cardM34[2].toLowerCase();
          const cardInOut =
            cardTerminalType === "entry"
              ? "in"
              : cardTerminalType === "exit"
              ? "out"
              : cardTerminalId?.includes("-E")
              ? "in"
              : "out";
          return `authorization-tps subway_${lineNum}_${cardInOut}_${stem}`;
        }

        let cardStationKey = "";
        if (command.station) {
          const fromStation = this.getStationKey(command.station);
          if (fromStation && !/[\u0080-\uFFFF]/.test(fromStation)) cardStationKey = fromStation;
        }
        if (!cardStationKey && cardTerminalId) {
          const match = cardTerminalId.match(/^M-([A-Z0-9]+)-[EX]\d+$/);
          if (match) {
            const stationCode = match[1];
            const codeToName: Record<string, string> = {
              SEOUL: "seoul",
              GANGNAM: "gangnam",
              GANGNAM2: "gangnam_2line",
              JONGNO3GA: "jongno3ga",
              SINDORIM: "sindorim",
              SINDORIM2: "sindorim_2line",
              HONGDAE: "hongdae",
              HAPJEONG: "hapjeong",
              SICHEONG: "sicheong",
              EULJIRO3GA: "euljiro3ga",
              SINDANG: "sindang",
              SADANG: "sadang",
              WANGSIMNI: "wangsimni",
              JAMSIL: "jamsil",
              DAERIM: "daerim",
            };
            cardStationKey =
              codeToName[stationCode] || stationCode.toLowerCase();
          }
        }

        if (!cardStationKey) {
          throw new Error(
            "Station information is required for card_tap command"
          );
        }
        const cardTransitPrefix = this.resolveTransitPrefix(command);

        const cardInOut =
          cardTerminalType === "entry"
            ? "in"
            : cardTerminalType === "exit"
            ? "out"
            : cardTerminalId?.includes("-E")
            ? "in"
            : cardTerminalId?.includes("-X")
            ? "out"
            : "in";

        return `authorization-tps ${cardTransitPrefix}_${cardInOut}_${cardStationKey}`;
      }
      case "ping":
        return "ping-tps";
      case "status":
        return "status-tps";
      case "reset":
        return "reset-tps";
      default:
        throw new Error(`Unknown command type: ${String(command.type)}`);
    }
  }

  /**
   * Java Terminal Simulator에 CLI 또는 GUI JSON 명령 전송
   * TLV 모드(직접 거래 21000)일 때는 Sign On만 TLV로 전송
   */
  async sendCommand(command: TerminalCommand): Promise<TerminalResponse> {
    if (!this.socket || this.socket.readyState !== "open") {
      throw new Error("Not connected to terminal simulator");
    }

    if (this.isTlvMode()) {
      if (command.type === "signon") {
        return this.sendTlvSignOn(command);
      }
      return Promise.resolve({
        success: false,
        message: `직접 거래 모드에서는 Sign On만 지원합니다. (요청: ${command.type})`,
        timestamp: Date.now(),
      });
    }

    return new Promise((resolve, reject) => {
      const hasTerminalId = command.terminalId && String(command.terminalId).trim();
      const hasJourneyLog = command.journeyLog && String(command.journeyLog).trim();
      const useGuiJson =
        (command.type === "signon" || command.type === "sync" || command.type === "card_tap") &&
        hasTerminalId &&
        (command.type === "signon" || hasJourneyLog); // signon은 terminalId만, sync/card_tap은 journeyLog 필요

      const message = useGuiJson
        ? JSON.stringify({
            type: command.type,
            terminalId: command.terminalId,
            ...(hasJourneyLog ? { journeyLog: command.journeyLog } : {}),
          }) + "\n"
        : this.commandToCliString(command) + "\n";

      console.log(useGuiJson ? `Sending GUI JSON: ${command.type}` : `Sending CLI command: ${message.trim()}`);

      const timeout = setTimeout(() => {
        reject(new Error("Command timeout"));
      }, 10000); // 10초 타임아웃

      this.responseBuffer = [];
      this.currentCommandType = command.type;

      const responseHandler = (response: TerminalResponse) => {
        clearTimeout(timeout);
        this.currentCommandType = null;
        resolve(response);
      };

      this.onceResponse(responseHandler);

      this.socket!.write(message, (error) => {
        if (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  private async sendTlvSignOn(command: TerminalCommand): Promise<TerminalResponse> {
    const terminalId = (command.terminalId && String(command.terminalId).trim()) || "GUI-TERMINAL-01";
    const body = encodeSignOnRequest(terminalId);
    const frame = encodeFrame(body);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Command timeout"));
      }, 10000);

      const responseHandler = (response: TerminalResponse) => {
        clearTimeout(timeout);
        resolve(response);
      };
      this.onceResponse(responseHandler);

      console.log("Sending TLV Sign On to TPS");
      this.socket!.write(frame, (error) => {
        if (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.socket?.readyState === "open";
  }

  /**
   * 텍스트 응답에서 에러 여부 판단
   */
  private isErrorResponse(lines: string[]): boolean {
    const errorKeywords = [
      "Exception",
      "Error",
      "Failed",
      "FAILED",
      "ERROR",
      "CardNotPresentException",
      "IOException",
      "SCARD_E_NO_SMARTCARD",
      "No card present",
      "Caused by",
      "at java.",
      "at com.",
    ];

    const fullText = lines.join("\n").toLowerCase();
    return errorKeywords.some((keyword) =>
      fullText.includes(keyword.toLowerCase())
    );
  }

  /**
   * deny-list 에러 여부 판단
   * Java DenyListManager는 ALLOWED여도 "[DenyList Check]", "DenySet" 등을 로그로 출력하므로,
   * 응답 전체에서 "denylist"만 보면 오탐이 난다. 실제 거부(ERROR + deny 관련 문구)일 때만 true.
   */
  private isDenyListError(lines: string[]): boolean {
    const lastLine = lines[lines.length - 1]?.trim() ?? "";
    const isErrorResponse =
      lastLine.toUpperCase().startsWith("ERROR") || lastLine === "ERROR";
    if (!isErrorResponse) return false;

    const fullText = lines.join("\n").toLowerCase();
    const denyListErrorPhrases = [
      "card is in deny list",
      "transaction declined",
      "거부된 카드",
      "승차 불가",
    ];
    return denyListErrorPhrases.some((phrase) =>
      fullText.includes(phrase.toLowerCase())
    );
  }

  /**
   * 현재 실행 중인 명령 타입 반환
   */
  private getCurrentCommandType(): TerminalCommandType | null {
    return this.currentCommandType;
  }

  /**
   * 승차/하차 성공 여부 판단
   * 카드 탭은 성공했지만 실제 승차/하차 처리가 실패했을 수 있음
   */
  private isTransactionSuccess(lines: string[]): boolean {
    const fullText = lines.join("\n");

    // 에러가 있으면 실패
    if (this.isErrorResponse(lines)) {
      return false;
    }

    // 최종 응답이 ERROR로 시작하면 실패
    const lastLine = lines[lines.length - 1]?.trim().toUpperCase();
    if (lastLine.startsWith("ERROR") || lastLine === "FAILED") {
      return false;
    }

    // 성공 키워드 확인
    const successKeywords = [
      "SUCCESS",
      "승차 성공",
      "하차 성공",
      "승차 완료",
      "하차 완료",
      "OK",
    ];

    const hasSuccessKeyword = successKeywords.some((keyword) =>
      fullText.toUpperCase().includes(keyword.toUpperCase())
    );

    // OK가 있고 에러가 없으면 성공으로 간주
    if (lastLine === "OK" && !this.isErrorResponse(lines)) {
      return true;
    }

    return hasSuccessKeyword;
  }

  /**
   * 응답이 완료되었는지 판단 (OK, ERROR 등 최종 응답이 왔는지)
   */
  private isResponseComplete(lines: string[]): boolean {
    const lastLine = lines[lines.length - 1]?.trim().toUpperCase();
    return (
      lastLine === "OK" || lastLine === "ERROR" || lastLine.startsWith("ERROR:")
    );
  }

  /**
   * TLV 모드: length-prefixed(2바이트 BE) 프레임 수신 후 ResponseMessage 디코딩
   */
  private handleTlvData(data: Buffer): void {
    this.tlvBuffer = Buffer.concat([this.tlvBuffer, data]);
    while (this.tlvBuffer.length >= 2) {
      const len = this.tlvBuffer.readUInt16BE(0);
      if (this.tlvBuffer.length < 2 + len) break;
      const body = this.tlvBuffer.subarray(2, 2 + len);
      this.tlvBuffer = this.tlvBuffer.subarray(2 + len);
      try {
        const { success, message } = decodeResponseMessage(body);
        this.emitResponse({ success, message, timestamp: Date.now() });
      } catch (e) {
        console.error("TLV response decode error:", e);
        this.emitResponse({
          success: false,
          message: String(e),
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * 데이터 수신 처리
   * TLV 모드(21000)일 때는 handleTlvData, 아니면 JSON/텍스트
   */
  private handleData(data: Buffer): void {
    if (this.isTlvMode()) {
      this.handleTlvData(data);
      return;
    }
    this.messageBuffer += data.toString();

    // 줄바꿈으로 메시지 구분
    const lines = this.messageBuffer.split("\n");
    this.messageBuffer = lines.pop() || ""; // 마지막 불완전한 메시지는 버퍼에 보관

    for (const line of lines) {
      if (line.trim()) {
        try {
          // 먼저 JSON으로 파싱 시도
          const parsed = JSON.parse(line);
          const response: TerminalResponse = {
            success: parsed.success !== false,
            message: parsed.message || line,
            data: parsed.data,
            timestamp: parsed.timestamp || Date.now(),
          };
          this.emitResponse(response);
        } catch {
          // JSON이 아니면 텍스트 응답으로 처리
          // 여러 줄 응답을 버퍼에 모음
          this.responseBuffer.push(line.trim());

          // 응답이 완료되었는지 확인 (OK 또는 ERROR가 오면 완료)
          if (this.isResponseComplete(this.responseBuffer)) {
            const fullMessage = this.responseBuffer.join("\n");
            const hasError = this.isErrorResponse(this.responseBuffer);
            const isTransactionSuccess = this.isTransactionSuccess(
              this.responseBuffer
            );

            // 카드 탭 명령의 경우 승차/하차 성공 여부를 명확히 표시
            const commandType = this.getCurrentCommandType();
            let responseMessage = fullMessage;

            if (commandType === "card_tap") {
              // deny-list 에러인 경우 특별한 메시지 표시
              if (this.isDenyListError(this.responseBuffer)) {
                responseMessage = "승차 할 수 없는 카드입니다.";
              } else if (isTransactionSuccess) {
                responseMessage = `승차/하차 성공\n\n${fullMessage}`;
              } else {
                responseMessage = `승차/하차 실패\n\n${fullMessage}`;
              }
            }

            const response: TerminalResponse = {
              success: isTransactionSuccess, // 승차/하차 성공 여부
              message: responseMessage,
              timestamp: Date.now(),
            };

            const status = hasError
              ? "ERROR"
              : isTransactionSuccess
              ? "SUCCESS"
              : "FAILED";
            console.log(`Received text response (${status}):`, fullMessage);
            this.emitResponse(response);

            // 버퍼 초기화
            this.responseBuffer = [];
          } else {
            // 아직 응답이 완료되지 않았으면 로그만 출력
            console.log("Received text response (partial):", line);
          }
        }
      }
    }
  }

  private responseListeners: Array<(response: TerminalResponse) => void> = [];

  private onceResponse(listener: (response: TerminalResponse) => void): void {
    this.responseListeners.push(listener);
  }

  private emitResponse(response: TerminalResponse): void {
    const listeners = [...this.responseListeners];
    this.responseListeners = [];
    listeners.forEach((listener) => listener(response));
  }

  /**
   * 재연결 스케줄링
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected() && !this.isConnecting) {
        console.log("Attempting to reconnect...");
        this.connect().catch(console.error);
      }
    }, this.config.reconnectInterval || 3000);
  }

  /**
   * 재연결 타이머 클리어
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
