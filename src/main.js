import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event"; // Moved listen import to top

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
    gitRepos: [
        { name: "", path: "" },
        { name: "", path: "" },
        { name: "", path: "" }
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
// 深度合併：確保 codex, claude, gemini, gitRepos 陣列也都存在
if (!config.codex) config.codex = DEFAULT_CONFIG.codex;
if (!config.claude) config.claude = DEFAULT_CONFIG.claude;
if (!config.gemini) config.gemini = DEFAULT_CONFIG.gemini;
if (!config.gitRepos) config.gitRepos = DEFAULT_CONFIG.gitRepos;
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
    if (label) label.textContent = val + "% સ્ટો";
}

// --- 初始化 UI ---
function updateUI() {
    // 套用透明度
    setWindowOpacity(config.opacity);

    // 1. 更新 CLI 工具路徑
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

    // 2. 更新 Git Repos 設定欄位
    config.gitRepos.forEach((repo, index) => {
        safeSetValue(`inGitName${index}`, repo.name);
        safeSetValue(`inGitPath${index}`, repo.path);
    });

    // 3. 更新 Git Tab 的下拉選單
    updateGitSelect();
}

function updateGitSelect() {
    const select = document.getElementById("gitRepoSelect");
    if (!select) return;

    // 清空現有選項，保留 Placeholder
    select.innerHTML = '<option value="" disabled selected>Select a repository...</option>';

    config.gitRepos.forEach((repo, index) => {
        if (repo.path && repo.path.trim() !== "") {
            const option = document.createElement("option");
            option.value = index; // 用 index 當 value，方便回查
            // 顯示 Name 或是 Path
            option.textContent = repo.name ? repo.name : repo.path.split(/[\\/]/).pop(); 
            option.title = repo.path; // Tooltip 顯示完整路徑
            select.appendChild(option);
        }
    });
}

// 輔助函式：安全操作 DOM
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
    // else console.warn(`Element not found: ${id}`);
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


// --- Tab 切換邏輯 ---
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        // 1. Remove active from all tabs
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => {
            c.classList.remove("active");
            c.style.display = "none"; // 確保完全隱藏
        });

        // 2. Add active to clicked tab
        btn.classList.add("active");
        const tabId = btn.getAttribute("data-tab");
        const content = document.getElementById(tabId);
        if (content) {
            content.style.display = "flex";
            // 稍微延遲加 active 以觸發 fade-in
            setTimeout(() => content.classList.add("active"), 10);
        }

        // 3. Resize Window based on Tab
        try {
            // 使用後端指令來強制改變視窗大小 (解決 Windows resizable=false 的問題)
            if (tabId === "tab-git") {
                await invoke("resize_window", { width: 900.0, height: 750.0 });
            } else {
                await invoke("resize_window", { width: 400.0, height: 750.0 });
            }
        } catch (e) {
            console.error("Failed to resize window:", e);
        }
    });
});


// --- 啟動邏輯 (Launcher) ---
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

// 綁定按鈕事件 (Launcher)
const btnCodex = document.querySelector("#btnCodex");
if (btnCodex) btnCodex.addEventListener("click", () => launch("codex", "codex"));

const btnClaude = document.querySelector("#btnClaude");
if (btnClaude) btnClaude.addEventListener("click", () => launch("claude", "claude"));

const btnGemini = document.querySelector("#btnGemini");
if (btnGemini) btnGemini.addEventListener("click", () => launch("gemini", "gemini"));


// --- Git 控制邏輯 ---
async function runGit(command, args) {
    const outputEl = document.getElementById("gitOutput");
    const select = document.getElementById("gitRepoSelect");
    
    if (!select || select.value === "") {
        if (outputEl) outputEl.textContent = "Please select a repository first.";
        return;
    }

    const repoIndex = parseInt(select.value);
    const repoPath = config.gitRepos[repoIndex].path;

    if (outputEl) outputEl.textContent = `> git ${args.join(" ")}\n`;

    try {
        // 呼叫後端指令
        const result = await invoke("run_git_cmd", { cwd: repoPath, args: args });
        if (outputEl) outputEl.textContent = result;
    } catch (err) {
        if (outputEl) outputEl.textContent = `Error: ${err}`;
    }
}

document.getElementById("btnGitStatus")?.addEventListener("click", () => runGit("status", ["status"]));
document.getElementById("btnGitPull")?.addEventListener("click", () => runGit("pull", ["pull"]));
document.getElementById("btnGitLog")?.addEventListener("click", () => runGit("log", ["log", "--oneline", "-n", "10"]));


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
        // 1. Save Launcher Paths
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

        // 2. Save Git Repos
        config.gitRepos.forEach((repo, index) => {
            const n = document.getElementById(`inGitName${index}`);
            const p = document.getElementById(`inGitPath${index}`);
            if (n) repo.name = n.value;
            if (p) repo.path = p.value;
        });
        
        // 3. Save Opacity
        if (opacitySlider) {
            config.opacity = parseInt(opacitySlider.value);
        }

        localStorage.setItem("launcher_config", JSON.stringify(config));
        updateUI(); // Update Select Options
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
const launcherCommands = ["codex", "claude", "gemini"];

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
                // 判斷是在 Launcher Tab 還是在 Git Tab?
                // 目前僅 Launcher 支援拖曳啟動
                // 找出是哪個指令 (codex, claude, gemini)
                // 注意：現在因為多了 Git Panel，tool-group 的索引可能會變
                // 最好的方法是檢查父容器是誰
                const parentTab = group.parentElement;
                if (parentTab.id === "tab-launcher") {
                    // 在 tab-launcher 內的 tool-group 索引對應 commands
                    // 這裡重新抓一次 tab-launcher 裡面的 tool-group 來算 index
                    const launcherGroups = document.querySelectorAll("#tab-launcher .tool-group");
                    const index = Array.from(launcherGroups).indexOf(group);
                    
                    if (index !== -1 && index < launcherCommands.length) {
                         const command = launcherCommands[index];
                        // 啟動！
                        invoke("launch_cli", { tool: command, path: path })
                            .catch(err => alert("Drag Launch Failed: " + err));
                    }
                }
                
                // 清除樣式 (保險起見)
                group.classList.remove("drag-over");
            }
        }
    }
});
