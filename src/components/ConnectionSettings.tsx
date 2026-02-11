import { useState, useEffect } from "react";
import { tcpClient } from "@/utils/tcpClient";
import type { TcpConnectionConfig } from "@shared/types";
import { DEFAULT_TCP_CONFIG } from "@shared/types";

type ConnectionSettingsVariant = "floating" | "inline";

interface ConnectionSettingsProps {
  variant?: ConnectionSettingsVariant;
}

/**
 * TCP 연결 설정 컴포넌트
 * - floating: 화면 우하단 고정
 * - inline: 패널 내 배치
 */
export function ConnectionSettings({ variant = "floating" }: ConnectionSettingsProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [host, setHost] = useState(DEFAULT_TCP_CONFIG.host);
  const [port, setPort] = useState(DEFAULT_TCP_CONFIG.port.toString());
  const [isExpanded, setIsExpanded] = useState(true); // 기본적으로 펼쳐진 상태로 시작

  // Electron API 확인
  useEffect(() => {
    console.log("[ConnectionSettings] Component mounted");
    console.log(
      "[ConnectionSettings] window.electronAPI:",
      (window as any).electronAPI
    );
    if (!(window as any).electronAPI) {
      console.error("[ConnectionSettings] Electron API is not available!");
    }
  }, []);

  // 연결 상태 확인
  const checkConnection = async (): Promise<boolean> => {
    try {
      const connected = await tcpClient.isConnected();
      setIsConnected(connected);
      return connected;
    } catch (error) {
      setIsConnected(false);
      return false;
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const config: TcpConnectionConfig = {
        ...DEFAULT_TCP_CONFIG,
        host,
        port: parseInt(port, 10),
      };

      console.log("Attempting to connect to:", config.host, config.port);
      await tcpClient.connect(config);

      // 연결 후 상태 확인 (약간의 지연 후)
      await new Promise((resolve) => setTimeout(resolve, 300)); // 잠시 대기
      await checkConnection();

      // checkConnection이 상태를 업데이트하므로 다시 확인
      await new Promise((resolve) => setTimeout(resolve, 200));
      const finalCheck = await tcpClient.isConnected();

      if (!finalCheck) {
        throw new Error("연결되었지만 상태 확인에 실패했습니다");
      }

      console.log("Connection successful!");
    } catch (error) {
      console.error("Connection failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "연결에 실패했습니다";
      alert(
        `연결 실패: ${errorMessage}\n\n호스트: ${host}\n포트: ${port}\n\n소켓 서버가 실행 중인지 확인해주세요.`
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await tcpClient.disconnect();
      await checkConnection();
    } catch (error) {
      console.error("Disconnect failed:", error);
    }
  };

  const containerClass =
    variant === "floating"
      ? "fixed bottom-4 right-4 bg-card border rounded-lg shadow-lg p-4 min-w-[280px]"
      : "bg-card border rounded-lg shadow-sm p-4 w-full";

  return (
    <div className={containerClass}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <span className="text-sm font-medium">연결 설정</span>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? "연결됨" : "연결 안 됨"}
          </span>
          <span className="text-xs">{isExpanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-3 mt-3">
          <div>
            <label className="block text-xs font-medium mb-1">호스트</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              disabled={isConnected}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">포트</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isConnected}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isConnecting ? "연결 중..." : "연결"}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              연결 해제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
