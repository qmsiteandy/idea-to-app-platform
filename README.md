# Idea to App

從點子到上線的自動化開發平台。目前為 P0 骨架：單人密碼登入、專案列表、新增與檢視專案。

## 本機執行

```bash
cp .env.example .env.local   # 填入 APP_PASSWORD 與 SESSION_SECRET
npm install
npm run dev
```

未設定 Supabase 時，資料會暫存在 `.data/projects.json`（僅供本機開發）。

## 資料存放

所有資料存在 Notion 的「專案」資料庫，平台是唯一的編輯入口，Notion 為唯讀檢視。

1. 到 https://www.notion.so/profile/integrations 建立 internal integration，複製 token。
2. 在 Notion 開啟「專案 Projects」資料庫，右上角「…」→ Connections，加入該 integration。
3. 設定 `NOTION_TOKEN` 與 `NOTION_PROJECTS_DATA_SOURCE_ID`。

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
