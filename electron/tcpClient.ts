import { Socket } from "net";
import type {
  TcpConnectionConfig,
  TerminalCommand,
  TerminalResponse,
  TerminalCommandType,
} from "../shared/types.js";

/**
 * Java Terminal Simulator와의 TCP 통신을 담당하는 클라이언트
 */
export class TcpClient {
  private socket: Socket | null = null;
  private config: TcpConnectionConfig;
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageBuffer: string = "";
  private responseBuffer: string[] = []; // 여러 줄 응답을 모으기 위한 버퍼
  private currentCommandType: TerminalCommandType | null = null; // 현재 실행 중인 명령 타입

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
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  /**
   * 역 이름을 영어 소문자로 변환 (config 파일 형식에 맞춤)
   */
  private getStationKey(station?: string): string {
    if (!station) return "";

    const stationMap: Record<string, string> = {
      서울역: "seoul",
      강남역: "gangnam",
      종로3가역: "jongno3ga",
      신도림역: "sindorim",
      홍대입구역: "hongdae",
      합정역: "hapjeong",
    };

    return stationMap[station] || station.toLowerCase().replace(/\s+/g, "_");
  }

  /**
   * 명령어를 CLI 문자열로 변환
   */
  private commandToCliString(command: TerminalCommand): string {
    switch (command.type) {
      case "signon":
        return "signon-tps";
      case "signoff":
        return "signoff-tps";
      case "echo-test":
        return "echo-test-tps";
      case "sync":
        // sync 명령어는 terminalId와 type 정보가 필요함
        const terminalId = command.terminalId || "";
        const terminalType = command.terminalType as
          | "entry"
          | "exit"
          | undefined;

        // Terminal ID에서 역 이름 추출 (예: M-SEOUL-E01 -> seoul)
        // 또는 command에서 station 정보 사용
        let stationKey = "";

        if (command.station) {
          // station 필드가 있으면 사용
          stationKey = this.getStationKey(command.station);
        } else if (terminalId) {
          // Terminal ID에서 역 이름 추출 (M-{역이름}-E01 형식)
          const match = terminalId.match(/^M-([A-Z0-9]+)-[EX]\d+$/);
          if (match) {
            const stationCode = match[1];
            // 역 코드를 역 이름으로 매핑
            const codeToName: Record<string, string> = {
              SEOUL: "seoul",
              GANGNAM: "gangnam",
              JONGNO3GA: "jongno3ga",
              SINDORIM: "sindorim",
              HONGDAE: "hongdae",
              HAPJEONG: "hapjeong",
            };
            stationKey = codeToName[stationCode] || stationCode.toLowerCase();
          }
        }

        if (!stationKey) {
          throw new Error("Station information is required for sync command");
        }

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

        return `sync-tms subway_${inOut}_${stationKey}`;
      case "card_tap":
        // 카드 탭 명령어: authorization-tps subway_in_{역이름} 또는 authorization-tps subway_out_{역이름}
        const cardTerminalId = command.terminalId || "";
        const cardTerminalType = command.terminalType as
          | "entry"
          | "exit"
          | undefined;

        let cardStationKey = "";

        if (command.station) {
          cardStationKey = this.getStationKey(command.station);
        } else if (cardTerminalId) {
          const match = cardTerminalId.match(/^M-([A-Z0-9]+)-[EX]\d+$/);
          if (match) {
            const stationCode = match[1];
            const codeToName: Record<string, string> = {
              SEOUL: "seoul",
              GANGNAM: "gangnam",
              JONGNO3GA: "jongno3ga",
              SINDORIM: "sindorim",
              HONGDAE: "hongdae",
              HAPJEONG: "hapjeong",
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

        return `authorization-tps subway_${cardInOut}_${cardStationKey}`;
      case "ping":
        return "ping-tps";
      case "status":
        return "status-tps";
      case "reset":
        return "reset-tps";
      default:
        throw new Error(`Unknown command type: ${(command as any).type}`);
    }
  }

  /**
   * Java Terminal Simulator에 CLI 명령 전송
   */
  async sendCommand(command: TerminalCommand): Promise<TerminalResponse> {
    if (!this.socket || this.socket.readyState !== "open") {
      throw new Error("Not connected to terminal simulator");
    }

    return new Promise((resolve, reject) => {
      // CLI 명령어 문자열로 변환
      const cliCommand = this.commandToCliString(command);
      const message = cliCommand + "\n"; // 줄바꿈으로 메시지 구분

      console.log(`Sending CLI command: ${cliCommand}`);

      const timeout = setTimeout(() => {
        reject(new Error("Command timeout"));
      }, 10000); // 10초 타임아웃

      // 응답 버퍼 초기화 (새 명령 전송 시)
      this.responseBuffer = [];
      this.currentCommandType = command.type; // 현재 명령 타입 저장

      // 응답을 기다리는 리스너 (일회성)
      const responseHandler = (response: TerminalResponse) => {
        clearTimeout(timeout);
        this.currentCommandType = null; // 응답 처리 후 초기화
        resolve(response);
      };

      // 임시로 응답 핸들러 등록 (실제 구현은 handleData에서 처리)
      this.onceResponse(responseHandler);

      this.socket!.write(message, (error) => {
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
   * 데이터 수신 처리
   * Java 서버가 JSON 또는 텍스트 응답을 보낼 수 있음
   */
  private handleData(data: Buffer): void {
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
        } catch (error) {
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
              if (isTransactionSuccess) {
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
