type TabKey = "simulator" | "direct";

interface LeftTabsProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabs: Array<{ id: TabKey; label: string; description: string }> = [
  {
    id: "simulator",
    label: "EMV 시뮬레이터 연동",
    description: "Terminal Simulator(TCP) 연동",
  },
  {
    id: "direct",
    label: "EMV 직접 거래",
    description: "Direct APDU 처리(예정)",
  },
];

export function LeftTabs({ activeTab, onChange }: LeftTabsProps) {
  return (
    <aside className="w-64 shrink-0 border-r bg-card p-4 space-y-3">
      <div className="pb-2 border-b">
        <h2 className="text-lg font-semibold">기능 모드</h2>
        <p className="text-xs text-muted-foreground">
          통신 방식에 따라 화면이 분리됩니다.
        </p>
      </div>
      <div className="space-y-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`w-full text-left px-3 py-3 rounded-lg border transition-colors ${
                isActive
                  ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-200"
                  : "bg-background border-transparent hover:bg-muted"
              }`}
            >
              <div className="text-sm font-medium">{tab.label}</div>
              <div className="text-xs text-muted-foreground">
                {tab.description}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
