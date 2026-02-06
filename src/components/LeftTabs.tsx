import { NavLink } from "react-router-dom";

type TabKey = "simulator" | "direct";

const tabs: Array<{ id: TabKey; path: string; label: string; description: string }> = [
  {
    id: "simulator",
    path: "/simulator",
    label: "EMV 시뮬레이터 연동",
    description: "Terminal Simulator(TCP) 연동",
  },
  {
    id: "direct",
    path: "/direct",
    label: "EMV 직접 거래",
    description: "Direct APDU 처리(예정)",
  },
];

export function LeftTabs() {
  return (
    <aside className="w-64 shrink-0 border-r bg-card p-6 space-y-4">
      <div className="pb-2 border-b">
        <h2 className="text-lg font-semibold">기능 모드</h2>
        <p className="text-xs text-muted-foreground">
          통신 방식에 따라 화면이 분리됩니다.
        </p>
      </div>
      <nav className="space-y-2" aria-label="기능 모드">
        {tabs.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.path}
            end={tab.path !== "/"}
            className={({ isActive }) =>
              `block w-full text-left px-3 py-3 rounded-lg border transition-colors ${
                isActive
                  ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-200"
                  : "bg-background border-transparent hover:bg-muted"
              }`
            }
          >
            <div className="text-sm font-medium">{tab.label}</div>
            <div className="text-xs text-muted-foreground">
              {tab.description}
            </div>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
