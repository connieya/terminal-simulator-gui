import { useState } from "react";
import { useTerminalStore } from "@/stores/terminalStore";
import { tcpClient } from "@/utils/tcpClient";
import { useToast } from "@/contexts/ToastContext";
import type { TerminalInfo, TerminalResponse, TcpConnectionConfig } from "@shared/types";
import { DEFAULT_TCP_CONFIG, DEFAULT_MGMT_TCP_CONFIG, BOOT_STAGES } from "@shared/types";
import {
  busRoutes,
  subwayStations,
  getSubwayJourneyLog,
  type BusStopOption,
  type SubwayStationOption,
} from "@/data/terminalPresets";
import { LINE_COLORS } from "@/data/stationCoordinates";
import { useJourneyStore } from "@/stores/journeyStore";

interface TerminalCardProps {
  terminal: TerminalInfo;
  /** 카드 탭 응답 수신 후 EMV 상세 모달 등을 열 때 사용 */
  onCardTapComplete?: (response: TerminalResponse) => void;
  /** 터미널 구동 시 미연결이면 이 설정으로 연결. 미전달 시 DEFAULT_TCP_CONFIG(시뮬레이터) 사용 */
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
  const [showDetail, setShowDetail] = useState(false);
  const effectiveTcpConfig = tcpConfig ?? DEFAULT_TCP_CONFIG;
  const { setTerminalPower, updateTerminal, setBootStage } = useTerminalStore();
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
      const station = selectedOption as SubwayStationOption;
      const key = terminal.type === "entry" ? station.entryPresetKey : station.exitPresetKey;
      if (key) return key;
      const inOut = terminal.type === "entry" ? "in" : "out";
      return `subway_${inOut}_${station.id}`;
    }
    const busStop = selectedOption as BusStopOption;
    return terminal.type === "entry" ? busStop.entryPresetKey : busStop.exitPresetKey;
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

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handlePowerToggle = async () => {
    setIsProcessing(true);
    try {
      const commandType = terminal.isPoweredOn ? "signoff" : "signon";

      if (commandType === "signoff") {
        // 터미널 종료: signoff → 거래 서버, 듀얼 연결 해제
        try {
          const journeyLog = getJourneyLog();
          await tcpClient.sendCommand({
            type: commandType,
            terminalId: terminal.terminalId,
            transitType: terminal.transitType,
            ...(journeyLog ? { journeyLog } : { presetKey: getPresetKey() }),
          });
        } catch {
          // signoff 실패해도 종료 진행
        }
        await tcpClient.disconnectAll();
        setTerminalPower(terminal.id, false);
        updateTerminal(terminal.id, { lastCommandTime: Date.now() });
        return;
      }

      // 터미널 구동: 부트 시퀀스 시뮬레이션
      // 1. 데몬 연결 (듀얼 TCP 연결)
      setBootStage(terminal.id, "daemon_connect");
      const dualResult = await tcpClient.connectDual(
        effectiveTcpConfig,
        DEFAULT_MGMT_TCP_CONFIG,
      );

      // 관리 서버 실패 → 부트 중단
      if (!dualResult.mgmt.success) {
        setBootStage(terminal.id, "off");
        showError(
          `관리 서버에 연결할 수 없습니다: ${dualResult.mgmt.error || "Unknown error"}`
        );
        return;
      }

      // 거래 서버 실패 → 경고만 (카드 탭 불가하지만 부트는 계속)
      if (!dualResult.txn.success) {
        showError(
          "거래 서버에 연결할 수 없습니다. 카드 탭이 불가합니다."
        );
      }

      // 2. 리더기 감지
      setBootStage(terminal.id, "reader_detect");
      await delay(300);

      // 3. VSAM 감지
      setBootStage(terminal.id, "vsam_detect");
      await delay(300);

      // 4. 라이브러리 초기화
      setBootStage(terminal.id, "lib_init");
      await delay(300);

      // 5. 리스트 동기화 (양쪽 서버에 병렬 전송)
      setBootStage(terminal.id, "list_sync");
      const journeyLog = getJourneyLog();

      // signon → 거래 서버(9999), list_sync → 관리 서버(21000, CLIB LIST_UPDATE)
      const syncPromises: Promise<unknown>[] = [];

      // 거래 서버가 연결되어 있으면 signon 전송
      if (dualResult.txn.success) {
        syncPromises.push(
          tcpClient.sendCommand({
            type: "signon",
            terminalId: terminal.terminalId,
            transitType: terminal.transitType,
            ...(journeyLog ? { journeyLog } : { presetKey: getPresetKey() }),
          })
        );
      }

      // 관리 서버에 LIST_UPDATE 전송
      syncPromises.push(
        tcpClient.sendCommand({ type: "list_sync" })
      );

      const results = await Promise.allSettled(syncPromises);

      // 결과 확인: signon 결과 (거래 서버 연결된 경우만)
      const signonIdx = dualResult.txn.success ? 0 : -1;
      const listSyncIdx = dualResult.txn.success ? 1 : 0;

      if (signonIdx >= 0) {
        const signonResult = results[signonIdx];
        if (signonResult.status === "rejected") {
          setBootStage(terminal.id, "off");
          showError(`Signon 실패: ${signonResult.reason}`);
          return;
        }
        const signonResponse = signonResult.value as { success: boolean; message?: string };
        if (!signonResponse.success) {
          setBootStage(terminal.id, "off");
          showError(`Signon 실패: ${signonResponse.message || "Unknown error"}`);
          return;
        }
      }

      const listSyncResult = results[listSyncIdx];
      if (listSyncResult.status === "rejected") {
        // LIST_UPDATE 실패는 경고만 (치명적이지 않음)
        console.warn("LIST_UPDATE failed:", listSyncResult.reason);
      }

      // 6. 운영 대기
      setBootStage(terminal.id, "ready");
      setTerminalPower(terminal.id, true);
      updateTerminal(terminal.id, { lastCommandTime: Date.now() });
    } catch (error) {
      console.error("Power toggle failed:", error);
      setBootStage(terminal.id, "off");
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

      // 직접 거래 모드: 리더에 카드가 태그될 때까지 대기(최대 30초) 후 연결
      if (tcpConfig && window.electronAPI?.cardReader?.runEmvTransaction) {
        success("카드를 리더에 태그해 주세요. (최대 30초 대기)");
        const emvResult = await window.electronAPI.cardReader.runEmvTransaction();
        if (!emvResult.success) {
          showError(emvResult.error ?? "EMV 트랜잭션 실패");
          return;
        }
        success("ICC Data 수집 완료. (우측 로그 참고)");
        updateTerminal(terminal.id, { lastCommandTime: Date.now() });
        onCardTapComplete?.({ success: true, timestamp: Date.now() });
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

  const lineName = resolveLineName();
  const lineColor = isSubway && lineName ? (LINE_COLORS[lineName] ?? "#666") : "#666";
  const displayStationName = terminal.station || (isSubway ? "역을 선택하세요" : "정류장을 선택하세요");

  const btnBase =
    "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

  return (
    <div className="max-w-sm rounded-2xl border-2 border-slate-700 bg-slate-800/80 p-4 shadow-lg">
      {/* 터미널 구동 버튼 (상단) */}
      <button
        onClick={handlePowerToggle}
        disabled={isProcessing}
        className={`mb-4 w-full ${btnBase} ${
          terminal.isPoweredOn
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {isProcessing ? "처리 중..." : terminal.isPoweredOn ? "터미널 종료" : "터미널 구동"}
      </button>

      {/* 디스플레이 중심 영역 */}
      <div className="mb-4 rounded-xl bg-slate-900/90 px-4 py-6">
        {/* 노선 뱃지 */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="inline-block h-3 w-8 shrink-0 rounded-sm"
            style={{ backgroundColor: lineColor }}
            aria-hidden
          />
          <span className="text-base font-semibold text-slate-200">{lineName || "—"}</span>
        </div>
        
        {/* 역명/정류장명 (큰 글씨 - 디스플레이 중심) */}
        <p className="text-3xl font-bold tracking-tight text-white mb-4">
          {displayStationName}
        </p>
        
        {/* 승차/하차 드롭다운 */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400 mb-2">승차/하차</label>
          <select
            value={terminal.type}
            onChange={(e) => handleTypeChange(e.target.value as "entry" | "exit")}
            disabled={isProcessing}
            className="w-full rounded-lg px-3 py-2.5 text-sm font-medium bg-slate-700 text-slate-200 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="entry">승차</option>
            <option value="exit">하차</option>
          </select>
        </div>
      </div>

      {/* 부트 시퀀스 상태바 */}
      <div className="mb-3">
        {terminal.bootStage === "off" ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-500" />
            <span className="text-slate-400">대기</span>
          </div>
        ) : terminal.bootStage === "ready" ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-400">운영 중</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {BOOT_STAGES.map(({ stage }, i) => {
                const currentIndex = BOOT_STAGES.findIndex(
                  (s) => s.stage === terminal.bootStage
                );
                const isDone = i < currentIndex;
                const isCurrent = i === currentIndex;
                return (
                  <div
                    key={stage}
                    className={`h-1.5 flex-1 rounded-full ${
                      isDone
                        ? "bg-emerald-500"
                        : isCurrent
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-slate-600"
                    }`}
                  />
                );
              })}
            </div>
            <p className="text-xs text-slate-400">
              {BOOT_STAGES.find((s) => s.stage === terminal.bootStage)?.label ?? ""} 중...
            </p>
          </div>
        )}
      </div>

      {/* 전원 ON 시: Sync · Echo Test (보조) → 카드 탭 (메인) */}
      {terminal.isPoweredOn && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSync}
              disabled={isProcessing}
              className={`${btnBase} bg-slate-600 text-slate-200 hover:bg-slate-500 text-xs`}
            >
              Sync
            </button>
            <button
              onClick={handleEchoTest}
              disabled={isProcessing}
              className={`${btnBase} bg-slate-600 text-slate-200 hover:bg-slate-500 text-xs`}
            >
              Echo Test
            </button>
          </div>
          <button
            onClick={handleCardTap}
            disabled={isProcessing}
            className={`w-full rounded-xl py-4 text-base font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:pointer-events-none`}
          >
            {isProcessing ? "처리 중..." : "카드 탭"}
          </button>
        </div>
      )}

      {/* 부가 정보: 접이식 */}
      <div className="mt-3 border-t border-slate-600 pt-2">
        <button
          type="button"
          onClick={() => setShowDetail(!showDetail)}
          className="text-xs text-slate-500 hover:text-slate-400"
        >
          {showDetail ? "상세 정보 접기" : "상세 정보"}
        </button>
        {showDetail && (
          <div className="mt-2 space-y-1 text-xs font-mono text-slate-500">
            <p>Terminal ID: {terminal.terminalId}</p>
            {isSubway && selectedOption && (
              <p>Station ID: {(selectedOption as SubwayStationOption).stationId}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
