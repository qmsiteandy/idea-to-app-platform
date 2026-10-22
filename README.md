# Idea to App

從點子到上線的自動化開發平台。目前為 P0 骨架：單人密碼登入、專案列表、新增與檢視專案。

## 本機執行

```bash
cp .env.example .env.local   # 填入 APP_PASSWORD 與 SESSION_SECRET
npm install
npm run dev
```

未設定 Supabase 時，資料會暫存在 `.data/projects.json`（僅供本機開發）。

## 資料庫

在 Supabase SQL editor 執行 `supabase/schema.sql`，再設定 `SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY`。

## 部署

匯入 Vercel，設定 `.env.example` 內的四個環境變數即可。
