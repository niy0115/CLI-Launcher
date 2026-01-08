# 專案上下文：Codex Launcher

## 概覽
**Codex Launcher** 是一個基於 **Tauri v2** 開發的專用桌面工具。它提供了一個輕量化、透明且置頂的啟動器視窗，整合了 **AI CLI 啟動器** 與 **Git 版本控制面板**。

## GitHub Repository
- **URL**: https://github.com/niy0115/CLI-Launcher.git

## 主要功能 (v0.2.0 Completed)

### 1. AI CLI 啟動器 (Launcher Tab)
- **多工具支援**：Codex, Claude Code, Gemini。
- **動態路徑配置**：支援自定義路徑與別名，儲存於 `localStorage`。
- **獨立視窗**：使用 `CREATE_NEW_CONSOLE` (0x10) 啟動獨立的 PowerShell 7 視窗。
- **拖曳啟動**：支援將資料夾拖曳至工具區塊以啟動。

### 2. Git 版本控制面板 (Git Tab)
- **專用介面**：透過 Tab 切換，視窗會自動變寬以容納資訊。
- **Repo 管理**：可設定多組 Git 專案路徑，透過下拉選單快速切換。
- **核心指令**：
    - **Status**: 查看當前狀態。
    - **Pull**: 拉取遠端更新。
    - **Log**: 查看最近 10 筆提交紀錄 (橘色終端機風格顯示)。
- **背景執行**：使用 `CREATE_NO_WINDOW` (0x08000000) 靜默執行 Git 指令並捕獲輸出，不彈出黑視窗。

### 3. UI/UX 與視窗管理
- **Cyberpunk 風格**：深色半透明玻璃擬態，搭配霓虹光效 (Cyan/Purple/Green/Orange)。
- **動態視窗縮放**：
    - **Launcher 模式**：400x750 (緊湊)。
    - **Git 模式**：900x750 (寬螢幕，方便閱讀 Log)。
    - **鎖定機制**：視窗邊緣不可手動拖拉 (`resizable: false`)，縮放完全由程式控制。
- **系統整合**：支援系統托盤 (Tray) 常駐，點擊左鍵喚醒/隱藏。

## 技術棧
- **前端：** Vanilla HTML/CSS/JS + **Vite**。
- **後端：** Rust (Tauri v2)。
- **通訊：** Tauri `invoke` (指令呼叫) + Event System。

## 關鍵檔案與結構

### 前端 (`src/`)
- **`index.html`**: 新增 Tabs 結構與 Git Panel 區塊。
- **`styles.css`**: 新增 Git 面板樣式 (Orange Theme) 與終端機文字樣式 (14px)。
- **`main.js`**: 
    - 實作 Tab 切換邏輯。
    - 呼叫後端 `resize_window` 進行動態縮放。
    - 處理 Git 指令的回傳顯示。

### 後端 (`src-tauri/`)
- **`src/lib.rs`**: 
    - `launch_cli`: 啟動 CLI 工具。
    - `run_git_cmd`: 執行 Git 指令並回傳 stdout/stderr。
    - `resize_window`: **關鍵實作**。解決 Windows 鎖定視窗後無法用 JS `setSize` 的問題。邏輯為：解鎖 -> 設定大小 -> 延遲鎖定。
- **`tauri.conf.json`**: 設定 `resizable: false` 以禁止使用者手動調整大小。

## 建置與執行

### 開發環境
```bash
npm run tauri dev
```

### 正式建置 (Release)
```bash
npm run tauri build
```
產出執行檔: `src-tauri/target/release/codex-launcher.exe`

## 開發注意事項
- **視窗縮放**：若要調整視窗大小，**必須**使用後端的 `resize_window` 指令，前端 API 在 `resizable: false` 下會失效。
- **Git 路徑**：需確保設定的路徑內包含 `.git` 資料夾，否則指令會失敗。
- **字型**：終端機輸出使用 `Consolas` 或 `Monospace` 字體以確保排版整齊。