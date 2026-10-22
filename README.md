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

## 收件匣自動化（M1）

Notion「收件匣」資料庫中 `Handled=待處理`、`Type=新專案` 的點子，會由 GitHub Actions（`.github/workflows/inbox.yml`，每 15 分鐘或手動觸發）自動建立成專案，並用 Claude 產生 PRD 寫進專案頁面，狀態改為「PRD 待審」並留言通知。（`Type=新功能` 暫不處理。）

設定：
1. 收件匣與專案兩個 Notion 資料庫都要分享給 integration（Connections）。
2. GitHub repo → Settings → Secrets and variables → Actions 新增：
   - `NOTION_TOKEN`：Notion integration token
   - `CLAUDE_CODE_OAUTH_TOKEN`：在本機執行 `claude setup-token` 取得（使用 Claude 訂閱，不需 API key）
3. 資料庫 id 與 `APP_URL` 寫在 workflow 的 `env`，換環境時修改該處。

腳本（`scripts/`）：`inbox-sync.mjs`、`prd-targets.mjs`、`prd-write.mjs <pageId> <file.md>`，皆需 `NOTION_TOKEN`。
