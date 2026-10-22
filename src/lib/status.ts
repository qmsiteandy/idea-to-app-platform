// 專案流程的五個階段；順序即流程順序。純資料，client 與 server 元件都能引用。
export type ProjectStatus =
  | "discussing"
  | "prd_review"
  | "building"
  | "live"
  | "iterating";

export const STATUS_ORDER: ProjectStatus[] = [
  "discussing",
  "prd_review",
  "building",
  "live",
  "iterating",
];

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  discussing: "討論中",
  prd_review: "PRD 待審",
  building: "建置中",
  live: "已上線",
  iterating: "迭代中",
};

export const STATUS_STYLE: Record<ProjectStatus, { badge: string; dot: string }> = {
  discussing: { badge: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  prd_review: { badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  building: { badge: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  live: { badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  iterating: { badge: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
};

// 每個階段「下一步該做什麼」。AI 訪談、建置等功能開放前，誠實標示為即將推出。
export const NEXT_STEP: Record<ProjectStatus, { title: string; hint: string; available: boolean }> = {
  discussing: {
    title: "與 AI 討論需求",
    hint: "AI 會逐步追問目標使用者、核心功能與限制，整理成結構化需求。",
    available: false,
  },
  prd_review: {
    title: "審核並修改 PRD",
    hint: "確認產出的 PRD 與功能清單，沒問題就按「開始建立專案」。",
    available: false,
  },
  building: {
    title: "等待自動建置",
    hint: "AI 正在依 PRD 實作並跑測試，完成後會自動開 PR。",
    available: false,
  },
  live: {
    title: "新增功能到 Todo",
    hint: "把想要的功能排進清單，系統會逐項實作並產生新版本。",
    available: false,
  },
  iterating: {
    title: "檢視進行中的功能",
    hint: "查看每個功能的 PR 與預覽網址，核准後上線。",
    available: false,
  },
};
