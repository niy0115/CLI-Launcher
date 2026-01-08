# 新專案建立指南 (基於 Codex Launcher 模板)

這份指南將教您如何利用目前已經調校完成的 **Tauri + Vite + PowerShell 整合環境**，快速開發下一個桌面小工具。

---

## 🚀 快速複製步驟

### 1. 複製專案資料夾
將現有的 `codex-launcher` 資料夾直接複製一份，並重新命名為您的新專案名稱（例如 `my-new-widget`）。

### 2. 環境清理 (瘦身)
在新資料夾內，刪除編譯產生的暫存檔以釋放空間：
- 刪除 `node_modules/` (前端套件)
- 刪除 `src-tauri/target/` (Rust 編譯產物，佔空間最大)

### 3. 修改專案識別資訊
打開 `src-tauri/tauri.conf.json`，修改以下欄位以確保系統能識別為新程式：
- **`productName`**: 您的程式名稱 (例如 `MyNewWidget`)。
- **`identifier`**: 唯一的識別碼 (例如 `com.jerry.my-new-widget`)，不可與舊專案重複。
- **`app > windows > title`**: 視窗預設顯示的標題。

### 4. 重新初始化並啟動
在終端機進入新專案路徑，執行：
```powershell
npm install       # 重新安裝前端依賴
npm run tauri dev # 啟動開發環境
```

---

## 🛠️ 開發關鍵組件說明

### 前端佈局 (`src/`)
- **透明度與拖曳**：
    - 在 `styles.css` 中，`.titlebar` 設定了 `-webkit-app-region: drag`，讓您可以拖動無邊框視窗。
    - **注意**：所有按鈕或可點擊元素必須設為 `-webkit-app-region: no-drag`，否則會無法點擊。
- **UI 尺寸**：
    - 若要調整視窗大小，需同步修改 `tauri.conf.json` 中的 `width/height` 以及 `styles.css` 裡的視覺比例。

### 後端邏輯 (`src-tauri/src/lib.rs`)
- **啟動外部程式**：
    - 專案已配置好 Windows 專用的 `CREATE_NEW_CONSOLE` 旗標，這能確保呼叫 `pwsh` 或 `cmd` 時能彈出獨立視窗。
- **路徑配置**：
    - 預設的工作路徑定義在 `WORK_DIR` 常數。若是不同工具需要不同路徑，可在此修改。

### 建置與發佈
- 當開發完成後，執行以下指令產生最終的 `.exe` 檔案：
  ```bash
  npm run tauri build
  ```
- 產出的執行檔位於：`src-tauri/target/release/您的專案名稱.exe`

---

## 💡 快速提示
- **Vite 整合**：目前的專案已整合 Vite，因此您可以在 JS 中自由使用 `import` 語法引用 Tauri API 或其他套件。
- **視窗置頂**：`tauri.conf.json` 預設開啟了 `alwaysOnTop: true`，適合做為常駐小工具使用。
- **清理快取**：若遇到奇怪的編譯錯誤，可執行 `cd src-tauri; cargo clean` 強制重編。
