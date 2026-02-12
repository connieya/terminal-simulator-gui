import { useState } from "react";
import { useTerminalStore } from "@/stores/terminalStore";
import { tcpClient } from "@/utils/tcpClient";
import { useToast } from "@/contexts/ToastContext";
import type { TerminalInfo, TerminalResponse, TcpConnectionConfig } from "@shared/types";
import { DEFAULT_TCP_CONFIG } from "@shared/types";
import {
  busRoutes,
  subwayStations,
  getSubwayJourneyLog,
  type BusStopOption,
  type SubwayStationOption,
} from "@/data/terminalPresets";
import { useJourneyStore } from "@/stores/journeyStore";

interface TerminalCardProps {
  terminal: TerminalInfo;
  /** 카드 탭 응답 수신 후 EMV 상세 모달 등을 열 때 사용 */
  onCardTapComplete?: (response: TerminalResponse) => void;
  /** Sign On 시 미연결이면 이 설정으로 연결. 미전달 시 DEFAULT_TCP_CONFIG(시뮬레이터) 사용 */
  tcpConfig?: TcpConnectionConfig;
}

/**
 * 단말기 카드 컴포넌트
 * 각 교통 단말기의 정보와 전원 on/off 기능을 제공
 */
export function TerminalCard({
  terminal,
  onCardTapComplete,
  tcpConfig,
}: TerminalCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const effectiveTcpConfig = tcpConfig ?? DEFAULT_TCP_CONFIG;
  const { setTerminalPower, updateTerminal } = useTerminalStore();
  const { success, error: showError } = useToast();
  const addJourney = useJourneyStore((state) => state.addJourney);
  const transitType =
    terminal.transitType ??
    (terminal.terminalId.startsWith("B") ? "bus" : "subway");
  const isSubway = transitType === "subway";
  const currentRoute =
    !isSubway
      ? (terminal.line
          ? busRoutes.find((r) => r.routeName === terminal.line) ?? null
          : busRoutes.find((r) =>
              r.stops?.some(
                (s) =>
                  s.entryTerminalId === terminal.terminalId ||
                  s.exitTerminalId === terminal.terminalId
              )
            ) ?? null)
      : null;
  const currentStop =
    currentRoute?.stops.find(
      (s) =>
        s.entryTerminalId === terminal.terminalId ||
        s.exitTerminalId === terminal.terminalId
    ) ?? null;
  const stationOptions = isSubway ? subwayStations : (currentRoute?.stops ?? []);
  const currentOption = isSubway
    ? subwayStations.find(
        (station) =>
          station.entryTerminalId === terminal.terminalId ||
          station.exitTerminalId === terminal.terminalId
      )
    : currentStop;
  const selectedOption = isSubway
    ? (currentOption || subwayStations[0])
    : (currentStop || (currentRoute?.stops[0] as BusStopOption | undefined));

  const resolveStationName = (_type: "entry" | "exit") => {
    if (!selectedOption) return terminal.station;
    if (isSubway) {
      return (selectedOption as SubwayStationOption).name;
    }
    return (selectedOption as BusStopOption).stopName;
  };

  const resolveLineName = () => {
    if (isSubway && selectedOption) {
      return (selectedOption as SubwayStationOption).line;
    }
    return terminal.line ?? currentRoute?.routeName ?? "";
  };

  /** GUI→Simulator JSON 전송용 journeyLog (있으면 presetKey 대신 사용) */
  const getJourneyLog = (): string | undefined => {
    if (!selectedOption) return undefined;
    if (isSubway) {
      return getSubwayJourneyLog(selectedOption as SubwayStationOption, terminal.type);
    }
    const busStop = selectedOption as BusStopOption;
    return terminal.type === "entry" ? busStop.entryJourneyLog : busStop.exitJourneyLog;
  };

  /** journeyLog 없을 때 CLI 폴백용 preset 키 */
  const getPresetKey = (): string => {
    if (!selectedOption) return "";
    if (isSubway) {
      const inOut = terminal.type === "entry" ? "in" : "out";
      return `subway_${inOut}_${selectedOption.id}`;
    }
    const busStop = selectedOption as BusStopOption;
    return terminal.type === "entry" ? busStop.entryPresetKey : busStop.exitPresetKey;
  };

  const handleStationChange = (id: string) => {
    const nextOption = stationOptions.find((option) => option.id === id);
    if (!nextOption) return;
    const nextTerminalId =
      terminal.type === "entry"
        ? nextOption.entryTerminalId
        : nextOption.exitTerminalId;
    const nextStationName = isSubway
      ? (nextOption as SubwayStationOption).name
      : (nextOption as BusStopOption).stopName;
    const nextLineName = isSubway
      ? (nextOption as SubwayStationOption).line
      : (currentRoute?.routeName ?? terminal.line);

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
      const commandType = terminal.isPoweredOn ? "signoff" : "signon";

      // 전원 켜기 시: TCP 미연결이면 먼저 연결 후 signon
      if (commandType === "signon") {
        const isConnected = await tcpClient.isConnected();
        if (!isConnected) {
          try {
            await tcpClient.connect(effectiveTcpConfig);
          } catch {
            showError(
              "서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요."
            );
            return;
          }
        }
      }

      const journeyLog = getJourneyLog();
      const response = await tcpClient.sendCommand({
        type: commandType,
        terminalId: terminal.terminalId,
        transitType: terminal.transitType,
        ...(journeyLog ? { journeyLog } : { presetKey: getPresetKey() }),
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
        showError("서버에 연결되지 않았습니다.");
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
        showError("서버에 연결되지 않았습니다.");
        return;
      }

      const journeyLog = getJourneyLog();
      const response = await tcpClient.sendCommand({
        type: "sync",
        terminalId: terminal.terminalId,
        terminalType: terminal.type,
        station: terminal.station,
        transitType: terminal.transitType,
        ...(journeyLog ? { journeyLog } : { presetKey: getPresetKey() }),
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
        showError("서버에 연결되지 않았습니다.");
        return;
      }

      const journeyLog = getJourneyLog();
      const response = await tcpClient.sendCommand({
        type: "card_tap",
        terminalId: terminal.terminalId,
        terminalType: terminal.type,
        station: terminal.station,
        transitType: terminal.transitType,
        ...(journeyLog ? { journeyLog } : { presetKey: getPresetKey() }),
      });

      if (response.success) {
        success("카드 탭 성공!");
        const stationName =
          isSubway && selectedOption
            ? (selectedOption as SubwayStationOption).name
            : terminal.station || "알 수 없음";
        addJourney({
          station: stationName,
          line: terminal.line,
          type: terminal.type,
          terminalId: terminal.terminalId,
          timestamp: Date.now(),
        });
        updateTerminal(terminal.id, {
          lastCommandTime: Date.now(),
        });
      } else {
        showError(`카드 탭 실패: ${response.message || "Unknown error"}`);
      }
      onCardTapComplete?.(response);
    } catch (error) {
      console.error("Card tap failed:", error);
      showError(
        error instanceof Error ? error.message : "카드 탭에 실패했습니다"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // 현재 모드 한 줄: "지하철 1호선 서울역 · 승차" / "버스 새벽A160 도봉산역 · 하차"
  const currentModeLine =
    [terminal.line, terminal.station].filter(Boolean).join(" ") +
    (terminal.station ? " · " : "") +
    (terminal.type === "entry" ? "승차" : "하차");

  const btnBase =
    "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

  return (
    <div className="rounded-xl border-2 border-border bg-card p-5 shadow-md transition-shadow hover:shadow-lg">
      {/* 단말기 헤더: 제목 + 현재 위치 한 줄, 우측 상단에 Sign On / Sign Off */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground tracking-tight">
            {terminal.name}
          </h3>
          {currentModeLine && (
            <p className="mt-1 text-sm text-muted-foreground">
              {isSubway ? "지하철 " : "버스 "}
              {currentModeLine}
            </p>
          )}
        </div>
        <button
          onClick={handlePowerToggle}
          disabled={isProcessing}
          className={`shrink-0 ${btnBase} ${
            terminal.isPoweredOn
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {isProcessing
            ? "처리 중..."
            : terminal.isPoweredOn
            ? "전원 끄기 (Sign Off)"
            : "전원 켜기 (Sign On)"}
        </button>
      </div>

      {/* 전원/연결 상태: LED 스타일 한 블록 */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full shadow-sm ${
              terminal.isPoweredOn
                ? "bg-emerald-500 ring-2 ring-emerald-400/50"
                : "bg-muted-foreground/40"
            }`}
            title={terminal.isPoweredOn ? "전원 ON" : "전원 OFF"}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {terminal.isPoweredOn ? "전원 ON" : "전원 OFF"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full shadow-sm ${
              terminal.isConnected
                ? "bg-blue-500 ring-2 ring-blue-400/50"
                : "bg-muted-foreground/40"
            }`}
            title={terminal.isConnected ? "연결됨" : "연결 안 됨"}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {terminal.isConnected ? "연결됨" : "연결 안 됨"}
          </span>
        </div>
        <span
          className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-md ${
            terminal.type === "entry"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          }`}
        >
          {terminal.type === "entry" ? "승차" : "하차"}
        </span>
      </div>

      {/* 상세: 노선/역, Terminal ID */}
      <div className="space-y-1 mb-4 text-sm text-muted-foreground">
        {terminal.line && <p>{terminal.line}</p>}
        {terminal.station && (
          <p>{isSubway ? "역" : "정류장"}: {terminal.station}</p>
        )}
        {isSubway && selectedOption && (
          <p className="text-xs font-mono">
            Station ID:{" "}
            <span className="font-semibold text-foreground">
              {(selectedOption as SubwayStationOption).stationId}
            </span>
          </p>
        )}
        <p className="text-xs font-mono">
          Terminal ID:{" "}
          <span className="font-semibold text-foreground">{terminal.terminalId}</span>
        </p>
      </div>

      {/* 위치/승하차 선택 */}
      <div className="space-y-3 mb-4">
        {!isSubway && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              정류장 선택
            </label>
            <select
              value={selectedOption?.id ?? ""}
              onChange={(event) => handleStationChange(event.target.value)}
              disabled={isProcessing || !currentRoute}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {!currentRoute ? (
                <option value="">노선을 먼저 선택하세요 (노선도에서 클릭)</option>
              ) : (
                currentRoute.stops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.stopName}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            승차/하차
          </label>
          <select
            value={terminal.type}
            onChange={(event) =>
              handleTypeChange(event.target.value as "entry" | "exit")
            }
            disabled={isProcessing}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="entry">승차</option>
            <option value="exit">하차</option>
          </select>
        </div>
      </div>

      {/* 전원 ON 시: Echo Test, Sync, 카드 탭 */}
      {terminal.isPoweredOn && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleEchoTest}
              disabled={isProcessing}
              className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}
            >
              Echo Test
            </button>
            <button
              onClick={handleSync}
              disabled={isProcessing}
              className={`${btnBase} bg-violet-600 text-white hover:bg-violet-700`}
            >
              Sync
            </button>
          </div>
          <button
            onClick={handleCardTap}
            disabled={isProcessing}
            className={`w-full ${btnBase} bg-amber-500 text-white hover:bg-amber-600 font-medium`}
          >
            {isProcessing ? "처리 중..." : "카드 탭"}
          </button>
        </div>
      )}
    </div>
  );
}
