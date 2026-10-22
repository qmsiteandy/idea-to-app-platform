# Idea to App

從點子到上線的自動化開發平台。目前為 P0 骨架：單人密碼登入、專案列表、新增與檢視專案。

## 本機執行

```bash
cp .env.example .env.local   # 填入 APP_PASSWORD 與 SESSION_SECRET
npm install
npm run dev
```

未設定 Notion 時，資料會暫存在 `.data/`（`projects.json`、`inbox.json`，僅供本機開發）。

## 資料存放

所有資料存在 Notion 的「專案」資料庫，平台是唯一的編輯入口，Notion 為唯讀檢視。

1. 到 https://www.notion.so/profile/integrations 建立 internal integration，複製 token。
2. 在 Notion 開啟「專案 Projects」資料庫，右上角「…」→ Connections，加入該 integration。
3. 設定 `NOTION_TOKEN` 與 `NOTION_PROJECTS_DATA_SOURCE_ID`。
4. 「新增想法」會寫入 Notion「收件匣」資料庫（欄位 Idea、Details、Type、Target project、Handled=待處理），
   請同樣把 integration 加入該資料庫，並設定 `NOTION_INBOX_DATA_SOURCE_ID`。

## 使用流程

- **新增想法**（`/ideas/new`）：填標題、說明、類型（新專案／新功能；新功能需填目標專案），送進收件匣，系統約 15 分鐘內接手。
- **待你處理**：首頁最上方列出狀態為「PRD 待審」的專案。
- **PRD**：專案詳情頁顯示 PRD（Notion 頁面內容），可用 Markdown 編輯（取代整份內容），並可「核准 PRD」將狀態改為「建置中」。
  自動建置功能仍在開發中，核准目前只會更新狀態。

## 部署

匯入 Vercel，設定 `.env.example` 內的環境變數即可。
