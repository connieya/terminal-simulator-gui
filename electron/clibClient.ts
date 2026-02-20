/**
 * CLIB 바이너리 프로토콜 전용 TCP 클라이언트.
 * terminal-transaction-server(관리 서버, port 21000)와 통신.
 */

import { Socket } from "net";
import type { TcpConnectionConfig, TerminalResponse } from "../shared/types.js";
import {
  encodeClibFrame,
  tryDecodeClibFrame,
  buildListRequestPacket,
  buildTransactionPacket,
  parseReply,
  parseListReply,
  statusCodeToString,
  LIST_ID_UNIFIED,
  STATUS_OK_DEFERRED,
  STATUS_OK_ONLINE,
} from "./clibCodec.js";

export class ClibClient {
  private socket: Socket | null = null;
  private config: TcpConnectionConfig;
  private recvBuffer: Buffer = Buffer.alloc(0);
  private atcCounter = 0;
  private uidSam: Buffer = Buffer.from([0x60, 0x21, 0x61, 0x73, 0x52]); // 기본 UID_SAM
  private isConnecting = false;

  private responseListeners: Array<(response: TerminalResponse) => void> = [];

  constructor(config: TcpConnectionConfig) {
    this.config = config;
  }

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
        reject(new Error("CLIB connection timeout"));
      }, this.config.timeout || 5000);

      this.socket.on("connect", () => {
        clearTimeout(timeout);
        this.isConnecting = false;
        console.log(
          `CLIB Connected to ${this.config.host}:${this.config.port}`
        );
        resolve();
      });

      this.socket.on("error", (error) => {
        clearTimeout(timeout);
        this.isConnecting = false;
        console.error("CLIB Connection error:", error);
        reject(error);
      });

      this.socket.on("close", () => {
        console.log("CLIB Connection closed");
        this.socket = null;
        this.recvBuffer = Buffer.alloc(0);
      });

      this.socket.on("data", (data: Buffer) => {
        this.handleData(data);
      });

      this.socket.connect(this.config.port, this.config.host);
    });
  }

  disconnect(): void {
    this.recvBuffer = Buffer.alloc(0);
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === "open";
  }

  /**
   * LIST_UPDATE 요청 전송 (리스트 동기화).
   * 부트 시퀀스 list_sync 단계에서 사용.
   */
  async sendListSync(
    listId: number = LIST_ID_UNIFIED,
    control?: Buffer
  ): Promise<TerminalResponse> {
    if (!this.socket || this.socket.readyState !== "open") {
      throw new Error("Not connected to management server");
    }

    const atc = this.nextAtc();
    const payload = buildListRequestPacket(atc, this.uidSam, listId, control);
    const frame = encodeClibFrame(payload);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("LIST_UPDATE timeout"));
      }, 10000);

      this.onceResponse((response) => {
        clearTimeout(timeout);
        resolve(response);
      });

      console.log(`Sending CLIB LIST_UPDATE (ATC=${atc}, listId=0x${listId.toString(16)})`);
      this.socket!.write(frame, (error) => {
        if (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * TRANSACTION 요청 전송 (향후 거래 이식용).
   */
  async sendTransaction(
    panHash: Buffer,
    tlvData?: Buffer,
    testMode = false
  ): Promise<TerminalResponse> {
    if (!this.socket || this.socket.readyState !== "open") {
      throw new Error("Not connected to management server");
    }

    const atc = this.nextAtc();
    const payload = buildTransactionPacket(
      atc,
      this.uidSam,
      panHash,
      tlvData,
      testMode
    );
    const frame = encodeClibFrame(payload);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("TRANSACTION timeout"));
      }, 15000);

      this.onceResponse((response) => {
        clearTimeout(timeout);
        resolve(response);
      });

      console.log(`Sending CLIB TRANSACTION (ATC=${atc})`);
      this.socket!.write(frame, (error) => {
        if (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  // ─── 내부 ─────────────────────────────────────────────────────────

  private nextAtc(): number {
    this.atcCounter = (this.atcCounter + 1) & 0xffffff; // 3바이트 범위
    return this.atcCounter;
  }

  private handleData(data: Buffer): void {
    this.recvBuffer = Buffer.concat([this.recvBuffer, data]);

    // CLIB 프레임 루프: 2바이트 LE 길이 + 페이로드
    while (true) {
      const result = tryDecodeClibFrame(this.recvBuffer);
      if (!result) break;

      this.recvBuffer = this.recvBuffer.subarray(result.consumed);
      this.processPayload(result.payload);
    }
  }

  private processPayload(payload: Buffer): void {
    try {
      // 최소 16바이트 reply
      const reply = parseReply(payload);
      const isOk =
        reply.statusCode === STATUS_OK_DEFERRED ||
        reply.statusCode === STATUS_OK_ONLINE;

      const response: TerminalResponse = {
        success: isOk,
        message: statusCodeToString(reply.statusCode),
        data: {
          statusCode: reply.statusCode,
          validationLevel: reply.validationLevel,
          syncFlags: reply.syncFlags,
          receiptJson: reply.receiptJson,
        },
        timestamp: Date.now(),
      };

      this.emitResponse(response);
    } catch (error) {
      // LIST_UPDATE 응답은 다른 구조일 수 있으므로 parseListReply 시도
      try {
        const listReply = parseListReply(payload);
        const response: TerminalResponse = {
          success: true,
          message: listReply.isEmpty
            ? "리스트 동기화 완료 (빈 목록)"
            : `리스트 동기화 완료 (${listReply.items.length}건)`,
          data: {
            itemCount: listReply.items.length,
            isEmpty: listReply.isEmpty,
          },
          timestamp: Date.now(),
        };
        this.emitResponse(response);
      } catch {
        console.error("CLIB response parse error:", error);
        this.emitResponse({
          success: false,
          message: `응답 파싱 실패: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: Date.now(),
        });
      }
    }
  }

  private onceResponse(listener: (response: TerminalResponse) => void): void {
    this.responseListeners.push(listener);
  }

  private emitResponse(response: TerminalResponse): void {
    const listeners = [...this.responseListeners];
    this.responseListeners = [];
    listeners.forEach((listener) => listener(response));
  }
}
