import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";

const appWindow = getCurrentWindow();

// --- 視窗透明度修復 (Acrylic Fix) ---
// 強制觸發重繪的加強版
appWindow.once('tauri://created', async () => {
    // 等待 500ms 讓視窗完全初始化
    setTimeout(async () => {
        try {
            const size = await appWindow.innerSize();
            // 改變大小
            await appWindow.setSize(new LogicalSize(size.width + 1, size.height + 1));
            
            // 延遲 100ms 後還原
            setTimeout(async () => {
                 await appWindow.setSize(new LogicalSize(size.width, size.height));
            }, 100);
        } catch (e) {
            console.error(e);
        }
    }, 500);
});
// DOM 載入時也嘗試一次，雙重保險
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            const factor = await appWindow.scaleFactor();
            const size = await appWindow.innerSize();
            const logicalWidth = size.width / factor;
            const logicalHeight = size.height / factor;
            
            await appWindow.setSize(new LogicalSize(logicalWidth + 1, logicalHeight));
            setTimeout(() => appWindow.setSize(new LogicalSize(logicalWidth, logicalHeight)), 100);
        } catch (e) {}
    }, 800); 
});

// 預設設定資料結構
const DEFAULT_CONFIG = {
    codex: [
        { name: "Default", path: "C:\\" },
        { name: "Alternative", path: "C:\\Work" }
    ],
    claude: [
        { name: "Default", path: "C:\\" },
        { name: "Alternative", path: "C:\\Work" }
    ],
    gemini: [
        { name: "Default", path: "C:\\" },
        { name: "Alternative", path: "C:\\Work" }
    ],
    opacity: 90 // 預設 90%
};

// 當前設定 (會從 localStorage 載入)
let savedConfig = {};
try {
    savedConfig = JSON.parse(localStorage.getItem("launcher_config")) || {};
} catch (e) {
    console.error("Failed to parse config", e);
}

// 合併預設值 (確保所有欄位都存在，避免舊資料造成 Crash)
let config = { ...DEFAULT_CONFIG, ...savedConfig };
// 深度合併：確保 codex, claude, gemini 陣列也都存在
if (!config.codex) config.codex = DEFAULT_CONFIG.codex;
if (!config.claude) config.claude = DEFAULT_CONFIG.claude;
if (!config.gemini) config.gemini = DEFAULT_CONFIG.gemini;
if (config.opacity === undefined) config.opacity = 90; // 相容舊設定

// --- 設定背景透明度 ---
function setWindowOpacity(val) {
    // val is 0-100
    const alpha = val / 100;
    // 使用深色背景 (R=15, G=15, B=20)
    document.documentElement.style.setProperty('--bg-color', `rgba(15, 15, 20, ${alpha})`);
    
    // 更新 UI 顯示
    const slider = document.getElementById("opacitySlider");
    const label = document.getElementById("opacityVal");
    if (slider && slider.value != val) slider.value = val;
    if (label) label.textContent = val + "%";
}

// --- 初始化 UI ---
function updateUI() {
    // 套用透明度
    setWindowOpacity(config.opacity);

    const tools = ["codex", "claude", "gemini"];
    tools.forEach(tool => {
        // 安全存取 DOM 元素，避免因為 ID 打錯而整個掛掉
        safeSetText(`lbl${capitalize(tool)}0`, config[tool][0].name || "Path 1");
        safeSetText(`lbl${capitalize(tool)}1`, config[tool][1].name || "Path 2");
        
        safeSetTitle(`lbl${capitalize(tool)}0`, config[tool][0].path);
        safeSetTitle(`lbl${capitalize(tool)}1`, config[tool][1].path);

        safeSetValue(`in${capitalize(tool)}Name0`, config[tool][0].name);
        safeSetValue(`in${capitalize(tool)}Path0`, config[tool][0].path);
        safeSetValue(`in${capitalize(tool)}Name1`, config[tool][1].name);
        safeSetValue(`in${capitalize(tool)}Path1`, config[tool][1].path);
    });
}

// 輔助函式：安全操作 DOM
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
    else console.warn(`Element not found: ${id}`);
}
function safeSetTitle(id, title) {
    const el = document.getElementById(id);
    if (el && el.parentElement) el.parentElement.title = title;
}
function safeSetValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// 首次執行更新
try {
    updateUI();
} catch (e) {
    alert("UI Init Failed: " + e);
}


// --- 視窗控制 ---
document.querySelector("#minBtn").addEventListener("click", () => appWindow.minimize());
document.querySelector("#closeBtn").addEventListener("click", () => appWindow.hide());


// --- 啟動邏輯 ---
async function launch(configKey, command) {
    const radios = document.getElementsByName(configKey + "Path");
    let selectedIndex = 0;
    for (const r of radios) {
        if (r.checked) {
            selectedIndex = parseInt(r.value);
            break;
        }
    }

    const targetPath = config[configKey][selectedIndex].path;

    if (!targetPath) {
        alert("Path is empty! Please set a path in settings.");
        return;
    }

    try {
        await invoke("launch_cli", { tool: command, path: targetPath });
    } catch (err) {
        alert("Launch Failed: " + err);
    }
}

// 綁定按鈕事件 (加強錯誤處理)
const btnCodex = document.querySelector("#btnCodex");
if (btnCodex) btnCodex.addEventListener("click", () => launch("codex", "codex"));

const btnClaude = document.querySelector("#btnClaude");
if (btnClaude) btnClaude.addEventListener("click", () => launch("claude", "claude"));

const btnGemini = document.querySelector("#btnGemini");
if (btnGemini) btnGemini.addEventListener("click", () => launch("gemini", "gemini"));


// --- 設定 Modal 邏輯 ---
const modal = document.getElementById("settingsModal");
const settingBtn = document.getElementById("settingBtn");
const closeSettingsBtn = document.getElementById("closeSettings");
const saveBtn = document.getElementById("saveBtn");
const opacitySlider = document.getElementById("opacitySlider");

if (opacitySlider) {
    // 即時預覽
    opacitySlider.addEventListener("input", (e) => {
        const val = e.target.value;
        setWindowOpacity(val);
    });
}

if (settingBtn) {
    settingBtn.addEventListener("click", () => {
        if (modal) {
            modal.style.display = "flex";
            updateUI(); // 這會重置 Slider 到 config 裡的值
        }
    });
}

if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", () => {
        if (modal) {
            modal.style.display = "none";
            // 如果沒存檔就關閉，要還原透明度
            setWindowOpacity(config.opacity);
        }
    });
}

if (saveBtn) {
    saveBtn.addEventListener("click", () => {
        const tools = ["codex", "claude", "gemini"];
        tools.forEach(tool => {
            const name0 = document.getElementById(`in${capitalize(tool)}Name0`);
            const path0 = document.getElementById(`in${capitalize(tool)}Path0`);
            const name1 = document.getElementById(`in${capitalize(tool)}Name1`);
            const path1 = document.getElementById(`in${capitalize(tool)}Path1`);

            if (name0) config[tool][0].name = name0.value;
            if (path0) config[tool][0].path = path0.value;
            if (name1) config[tool][1].name = name1.value;
            if (path1) config[tool][1].path = path1.value;
        });
        
        // 儲存透明度
        if (opacitySlider) {
            config.opacity = parseInt(opacitySlider.value);
        }

        localStorage.setItem("launcher_config", JSON.stringify(config));
        updateUI();
        if (modal) modal.style.display = "none";
    });
}

// --- 瀏覽資料夾按鈕邏輯 ---
document.querySelectorAll(".browse-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        const targetId = btn.getAttribute("data-target");
        const targetInput = document.getElementById(targetId);

        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: "Select Working Directory"
            });

            if (selected) {
                if (targetInput) targetInput.value = selected;
            }
        } catch (err) {
            console.error("Failed to open dialog:", err);
        }
    });
});

// --- 拖曳啟動邏輯 (Drag & Drop) ---
const toolGroups = document.querySelectorAll(".tool-group");
const commands = ["codex", "claude", "gemini"];

// 1. 純視覺回饋 (HTML5 Drag Events)
toolGroups.forEach((group) => {
    group.addEventListener("dragover", (e) => {
        e.preventDefault(); // 允許 Drop
        group.classList.add("drag-over");
    });
    group.addEventListener("dragleave", () => {
        group.classList.remove("drag-over");
    });
    group.addEventListener("drop", (e) => {
        e.preventDefault();
        group.classList.remove("drag-over");
    });
});

// 2. 邏輯處理 (Tauri Global Drag Event)
import { listen } from "@tauri-apps/api/event";

listen("tauri://drag-drop", (event) => {
    // event.payload = { paths: string[], position: { x, y } }
    if (event.payload.paths && event.payload.paths.length > 0) {
        const path = event.payload.paths[0];
        const { x, y } = event.payload.position;

        // 關鍵：用座標找出滑鼠底下的元素
        const element = document.elementFromPoint(x, y);
        
        if (element) {
            // 往上找最近的 .tool-group
            const group = element.closest(".tool-group");
            
            if (group) {
                // 找出是哪個指令 (codex, claude, gemini)
                // 我們可以靠 DOM 順序判斷
                const index = Array.from(toolGroups).indexOf(group);
                if (index !== -1) {
                    const command = commands[index];
                    // 啟動！
                    invoke("launch_cli", { tool: command, path: path })
                        .catch(err => alert("Drag Launch Failed: " + err));
                    
                    // 清除樣式 (保險起見)
                    group.classList.remove("drag-over");
                }
            }
        }
    }
});