import { useState } from "react";
import { useTerminalStore } from "@/stores/terminalStore";
import { tcpClient } from "@/utils/tcpClient";
import { useToast } from "@/contexts/ToastContext";
import type { TerminalInfo } from "@shared/types";
import {
  busRoutes,
  subwayStations,
  type BusRouteOption,
  type SubwayStationOption,
} from "@/data/terminalPresets";

interface TerminalCardProps {
  terminal: TerminalInfo;
}

/**
 * 단말기 카드 컴포넌트
 * 각 교통 단말기의 정보와 전원 on/off 기능을 제공
 */
export function TerminalCard({ terminal }: TerminalCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { setTerminalPower, updateTerminal } = useTerminalStore();
  const { success, error: showError } = useToast();
  const transitType =
    terminal.transitType ??
    (terminal.terminalId.startsWith("B") ? "bus" : "subway");
  const isSubway = transitType === "subway";
  const stationOptions = isSubway ? subwayStations : busRoutes;
  const currentOption = isSubway
    ? subwayStations.find(
        (station) =>
          station.entryTerminalId === terminal.terminalId ||
          station.exitTerminalId === terminal.terminalId
      )
    : busRoutes.find(
        (route) =>
          route.entryTerminalId === terminal.terminalId ||
          route.exitTerminalId === terminal.terminalId
      );
  const selectedOption = currentOption || stationOptions[0];

  const resolveStationName = (type: "entry" | "exit") => {
    if (!selectedOption) return terminal.station;
    if (isSubway) {
      return selectedOption.name;
    }
    return type === "entry"
      ? selectedOption.entryStopName
      : selectedOption.exitStopName;
  };

  const resolveLineName = () => {
    if (!selectedOption) return terminal.line;
    return isSubway ? selectedOption.line : selectedOption.routeName;
  };

  /** TerminalConfig.json journeyPresets 키와 동일한 preset 이름 (sync/authorization-tps 인자로 사용) */
  const getPresetKey = (): string => {
    if (!selectedOption) return "";
    if (isSubway) {
      const inOut = terminal.type === "entry" ? "in" : "out";
      return `subway_${inOut}_${selectedOption.id}`;
    }
    const busOption = selectedOption as BusRouteOption;
    return terminal.type === "entry" ? busOption.entryPresetKey : busOption.exitPresetKey;
  };

  const handleStationChange = (id: string) => {
    const nextOption = stationOptions.find((option) => option.id === id);
    if (!nextOption) return;
    const nextTerminalId =
      terminal.type === "entry"
        ? nextOption.entryTerminalId
        : nextOption.exitTerminalId;
    const nextStationName = isSubway
      ? nextOption.name
      : terminal.type === "entry"
      ? nextOption.entryStopName
      : nextOption.exitStopName;
    const nextLineName = isSubway ? nextOption.line : nextOption.routeName;

    updateTerminal(terminal.id, {
      terminalId: nextTerminalId,
      station: nextStationName,
      line: nextLineName,
    });
  };

  const handleTypeChange = (type: "entry" | "exit") => {
    if (!selectedOption) return;
    const nextTerminalId =
      type === "entry"
        ? selectedOption.entryTerminalId
        : selectedOption.exitTerminalId;
    const nextStationName = resolveStationName(type);
    const nextLineName = resolveLineName();

    updateTerminal(terminal.id, {
      type,
      terminalId: nextTerminalId,
      station: nextStationName,
      line: nextLineName,
    });
  };

  const handlePowerToggle = async () => {
    setIsProcessing(true);
    try {
      // TCP 연결 확인
      const isConnected = await tcpClient.isConnected();
      if (!isConnected) {
        showError(
          "Terminal Simulator에 연결되지 않았습니다. 먼저 연결해주세요."
        );
        return;
      }

      const commandType = terminal.isPoweredOn ? "signoff" : "signon";
      const response = await tcpClient.sendCommand({
        type: commandType,
        terminalId: terminal.terminalId,
        transitType: terminal.transitType,
      });

      if (response.success) {
        setTerminalPower(terminal.id, !terminal.isPoweredOn);
        updateTerminal(terminal.id, {
          lastCommandTime: Date.now(),
        });
      } else {
        showError(`명령 실행 실패: ${response.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Power toggle failed:", error);
      showError(
        error instanceof Error ? error.message : "명령 실행에 실패했습니다"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEchoTest = async () => {
    setIsProcessing(true);
    try {
      const isConnected = await tcpClient.isConnected();
      if (!isConnected) {
        showError("Terminal Simulator에 연결되지 않았습니다.");
        return;
      }

      const response = await tcpClient.sendCommand({
        type: "echo-test",
        terminalId: terminal.terminalId,
        transitType: terminal.transitType,
      });

      if (response.success) {
        success("Echo 테스트 성공!");
        updateTerminal(terminal.id, {
          lastCommandTime: Date.now(),
        });
      } else {
        showError(`Echo 테스트 실패: ${response.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Echo test failed:", error);
      showError(
        error instanceof Error ? error.message : "Echo 테스트에 실패했습니다"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async () => {
    setIsProcessing(true);
    try {
      const isConnected = await tcpClient.isConnected();
      if (!isConnected) {
        showError("Terminal Simulator에 연결되지 않았습니다.");
        return;
      }

      const response = await tcpClient.sendCommand({
        type: "sync",
        terminalId: terminal.terminalId,
        terminalType: terminal.type,
        station: terminal.station,
        transitType: terminal.transitType,
        presetKey: getPresetKey(), // TerminalConfig journeyPresets 키와 동일하게 전달
      });

      if (response.success) {
        success("동기화 성공!");
        updateTerminal(terminal.id, {
          lastCommandTime: Date.now(),
        });
      } else {
        showError(`동기화 실패: ${response.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Sync failed:", error);
      showError(
        error instanceof Error ? error.message : "동기화에 실패했습니다"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardTap = async () => {
    setIsProcessing(true);
    try {
      const isConnected = await tcpClient.isConnected();
      if (!isConnected) {
        showError("Terminal Simulator에 연결되지 않았습니다.");
        return;
      }

      const response = await tcpClient.sendCommand({
        type: "card_tap",
        terminalId: terminal.terminalId,
        terminalType: terminal.type,
        station: terminal.station,
        transitType: terminal.transitType,
        presetKey: getPresetKey(), // TerminalConfig journeyPresets 키와 동일하게 전달
      });

      if (response.success) {
        success("카드 탭 성공!");
        updateTerminal(terminal.id, {
          lastCommandTime: Date.now(),
        });
      } else {
        showError(`카드 탭 실패: ${response.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Card tap failed:", error);
      showError(
        error instanceof Error ? error.message : "카드 탭에 실패했습니다"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card hover:shadow-lg transition-shadow">
      {/* 단말기 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-foreground">
              {terminal.name}
            </h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {isSubway ? "지하철" : "버스"}
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded ${
                terminal.type === "entry"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              }`}
            >
              {terminal.type === "entry" ? "승차" : "하차"}
            </span>
          </div>
          <div className="space-y-1">
            {terminal.line && (
              <p className="text-sm text-muted-foreground">
                {terminal.line}
              </p>
            )}
            {terminal.station && (
              <p className="text-sm text-muted-foreground">
                {isSubway ? "역" : "정류장"}: {terminal.station}
              </p>
            )}
            {isSubway && selectedOption && (
              <p className="text-xs font-mono text-muted-foreground">
                Station ID:{" "}
                <span className="font-semibold">
                  {(selectedOption as SubwayStationOption).stationId}
                </span>
              </p>
            )}
            <p className="text-xs font-mono text-muted-foreground">
              Terminal ID:{" "}
              <span className="font-semibold">{terminal.terminalId}</span>
            </p>
          </div>
        </div>

        {/* 상태 표시 */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                terminal.isPoweredOn ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {terminal.isPoweredOn ? "전원 ON" : "전원 OFF"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                terminal.isConnected ? "bg-blue-500" : "bg-gray-400"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {terminal.isConnected ? "연결됨" : "연결 안 됨"}
            </span>
          </div>
        </div>
      </div>

      {/* 위치/승하차 선택 */}
      <div className="space-y-2 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1">
            {isSubway ? "역 선택" : "정류장 선택"}
          </label>
          <select
            value={selectedOption?.id || ""}
            onChange={(event) => handleStationChange(event.target.value)}
            disabled={isProcessing}
            className="w-full px-2 py-2 text-sm border rounded bg-background"
          >
            {isSubway &&
              subwayStations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.line ? `${station.name} (${station.line})` : station.name}
                </option>
              ))}
            {!isSubway &&
              busRoutes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.routeName} · {route.entryStopName} ↔ {route.exitStopName}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">승차/하차</label>
          <select
            value={terminal.type}
            onChange={(event) =>
              handleTypeChange(event.target.value as "entry" | "exit")
            }
            disabled={isProcessing}
            className="w-full px-2 py-2 text-sm border rounded bg-background"
          >
            <option value="entry">승차</option>
            <option value="exit">하차</option>
          </select>
        </div>
      </div>

      {/* 전원 버튼 */}
      <div className="space-y-2">
        <button
          onClick={handlePowerToggle}
          disabled={isProcessing}
          className={`w-full px-4 py-2 rounded font-medium transition-colors ${
            terminal.isPoweredOn
              ? "bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-400"
              : "bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-400"
          }`}
        >
          {isProcessing
            ? "처리 중..."
            : terminal.isPoweredOn
            ? "전원 끄기 (Sign Off)"
            : "전원 켜기 (Sign On)"}
        </button>

        {/* 추가 명령 버튼들 */}
        {terminal.isPoweredOn && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleEchoTest}
                disabled={isProcessing}
                className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
              >
                Echo Test
              </button>
              <button
                onClick={handleSync}
                disabled={isProcessing}
                className="px-3 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 transition-colors"
              >
                Sync
              </button>
            </div>
            <button
              onClick={handleCardTap}
              disabled={isProcessing}
              className="w-full px-4 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 transition-colors font-medium"
            >
              {isProcessing ? "처리 중..." : "카드 탭"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
