# 專案上下文：Codex Launcher

## 概覽
**Codex Launcher** 是一個基於 **Tauri v2** 開發的專用桌面工具。它提供了一個輕量化、透明且置頂的啟動器視窗，旨在快速開啟特定的 CLI 工具（**Codex**、**Claude Code** 與 **Gemini**）。這些工具會在新的 PowerShell 7 (`pwsh`) 視窗中執行，並自動切換到指定的起始目錄。

## 主要功能 (v0.1.0 Completed)
1.  **多工具支援**：支援 Codex, Claude Code, Gemini 三種 AI CLI 工具。
2.  **動態路徑配置**：
    -   每種工具可設定兩組常用路徑 (Default / Alternative)。
    -   支援自定義路徑別名 (例如 "Project Alpha")。
    -   整合原生檔案對話框 (Dialog Plugin)，可直接瀏覽選擇資料夾。
    -   設定自動儲存於 `localStorage`。
3.  **UI/UX 優化**：
    -   **Cyberpunk 風格**：採用深色半透明玻璃擬態 (Glassmorphism) 搭配霓虹光效（Cyan, Purple, Green 對應不同工具）。
    -   **拖曳啟動 (Drag & Drop)**：支援將資料夾拖曳至工具區塊以該路徑啟動 (邏輯已預留，待驗證)。
    -   **透明度控制**：內建設定介面，可即時調整視窗透明度 (Opacity)。
    -   **視窗行為**：無邊框設計、支援標題列拖曳、始終置頂 (Always on Top)。

## 技術棧
- **前端：** Vanilla HTML/CSS/JS + **Vite**。
- **後端：** Rust (Tauri v2)。
- **核心通訊：** Tauri `invoke` (啟動指令) 與 `tauri-plugin-dialog` (路徑選擇)。
- **程序管理：** Rust `std::process::Command` + `CREATE_NEW_CONSOLE` (獨立 PowerShell 視窗)。

## 關鍵檔案與結構

### 前端 (`src/`)
- **`index.html`**: UI 結構，包含三個工具區塊與設定 Modal。
- **`main.js`**: 
    -   處理視窗控制 (Minimize/Close)。
    -   **設定邏輯**：管理 `localStorage` 讀寫、UI 更新與 DOM 事件綁定。
    -   **啟動邏輯**：呼叫後端 `launch_cli` 並傳遞動態路徑。
- **`styles.css`**: 定義深色半透明樣式、霓虹發光特效、滑桿樣式與 `-webkit-app-region` 拖曳區。

### 後端 (`src-tauri/`)
- **`src/lib.rs`**: 
    -   `launch_cli`: 接收 `tool` 與 `path` 參數。
    -   使用 `Set-Location` 組合指令，並透過 `CREATE_NEW_CONSOLE` (0x10) 旗標啟動獨立 pwsh 視窗。
- **`tauri.conf.json`**: 
    -   視窗設定：`width: 400`, `height: 750`, `transparent: true`, `decorations: false`, `alwaysOnTop: true`。
    -   權限設定：啟用 `shell`, `dialog` 等功能。

## 建置與執行

### 開發環境
```bash
npm run tauri dev
```
啟動 Vite 開發伺服器與 Tauri 視窗。

### 正式建置 (Release)
```bash
npm run tauri build
```
產出安裝檔與執行檔：
- **執行檔**: `src-tauri/target/release/codex-launcher.exe`

## 開發注意事項
- **路徑處理**：前端已處理路徑參數傳遞，Rust 端負責路徑存在性檢查與單引號跳脫。
- **Windows 特效**：採用 CSS `rgba` 實現半透明背景，以確保在不同 Windows 版本下的視覺一致性。
- **Shell 整合**：目前直接呼叫 `pwsh`，需確保使用者系統已安裝 PowerShell 7。
