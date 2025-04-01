const { ipcRenderer } = require("electron");
const Chart = require("chart.js/auto");

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Renderer.js Loaded!");

    const selectDirButton = document.getElementById("selectDirButton");
    const scanButton = document.getElementById("scanButton");
    const commitButton = document.getElementById("commitButton");
    const pushButton = document.getElementById("pushButton");
    const selectedDirElement = document.getElementById("selectedDir");
    const scanResultsElement = document.getElementById("scanResults");
    const issuesWithFixes = [];
    const exportBtn = document.getElementById("exportBtn");
    const formatSelector = document.getElementById("exportFormat");
    


    let chartInstance = null;

    if (!selectDirButton || !scanButton || !commitButton || !pushButton || !selectedDirElement) {
        console.error("❌ ERROR: One or more elements were not found in the DOM.");
        return;
    }

     // Select directory button event
     selectDirButton.addEventListener("click", () => {
        console.log("📂 Select Directory Clicked!");
        ipcRenderer.send("open-directory-dialog");
    });
     
ipcRenderer.on("selected-directory", (event, path) => {
  console.log("📂 Selected Directory:", path);
  selectedDirElement.innerText = `📂 Selected: ${path}`;

  // ✅ Store it in recent list
  storeRecentDirectory(path);

  // ✅ Enable buttons
  scanButton.disabled = false;
  commitButton.disabled = false;
  pushButton.disabled = false;

  selectedDirectory = path;
});




    // Run security scan
    scanButton.addEventListener("click", () => {
        console.log("🔍 Scan button clicked!");

        if (selectedDirElement.innerText.includes("No directory selected")) {
            console.warn("⚠️ No directory selected! Scan cannot proceed.");
            alert("⚠️ Please select a directory first!");
            return;
        }

        const directoryPath = selectedDirElement.innerText.replace("📂 Selected: ", "").trim();
        console.log("📂 Sending scan request for:", directoryPath);

        ipcRenderer.send("run-snyk-scan", directoryPath);
    });
    

    ipcRenderer.on("snyk-scan-result", (event, result) => {
    const severityDetails = {
        high: [],
        medium: [],
        low: [],
        info: []
    };

    // Extract lines like "✗ SQL Injection [High Severity]"
    const lines = result.split("\n");
    lines.forEach(line => {
        const match = line.match(/✗ (.*?) \[(High|Medium|Low|Info) Severity\]/i);
        if (match) {
            const vuln = match[1].trim();
            const severity = match[2].toLowerCase();
            if (severityDetails[severity]) {
                severityDetails[severity].push(vuln);
            }
        }
    });

    const severityCounts = {
        high: severityDetails.high.length,
        medium: severityDetails.medium.length,
        low: severityDetails.low.length,
        info: severityDetails.info.length
    };

    for (let i = 0; i < lines.length; i++) {
    const vulnMatch = lines[i].match(/✗ (.*?) \[(High|Medium|Low|Info) Severity\]/i);
    if (vulnMatch) {
        const vuln = vulnMatch[1].trim();

        // Look ahead to find a "Fixed in:" line
        const fixLine = lines[i + 2] || "";
        const fixMatch = fixLine.match(/Fixed in: (.*)/i);

        if (fixMatch) {
            const fixedVersion = fixMatch[1].trim();
            issuesWithFixes.push({
                issue: vuln,
                fix: fixedVersion
            });
        } else {
            issuesWithFixes.push({
                issue: vuln,
                fix: null
            });
        }
    }
}




    if (chartInstance) chartInstance.destroy();

    const ctx = document.getElementById("vulnChart").getContext("2d");
    chartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["High", "Medium", "Low", "Info"],
            datasets: [{
                data: [
                    severityCounts.high,
                    severityCounts.medium,
                    severityCounts.low,
                    severityCounts.info
                ],
                backgroundColor: ["#e74c3c", "#f39c12", "#2ecc71", "#95a5a6"]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
    enabled: true,
    displayColors: false,
    usePointStyle: true,
    boxPadding: 5,
    padding: 10,
    bodyFont: {
        size: 12
    },
    callbacks: {
        label: function (context) {
            const label = context.label;
            const value = context.raw;
            const lower = label.toLowerCase();
            const list = severityDetails[lower];

            if (!list || list.length === 0) return [`${label} (${value}): None`];

            // Chunk lines to prevent very long strings
            const maxPerLine = 1;
            const formatted = [`${label} (${value}):`];
            for (let i = 0; i < list.length; i += maxPerLine) {
                formatted.push(`→ ${list.slice(i, i + maxPerLine).join(", ")}`);
            }
            return formatted;
        }
    }
}
,
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Vulnerabilities by Severity'
                }
            }
        }
    });

    // Raw output shown below chart
    document.getElementById("scanTextOutput").innerText = result;
});

    

    commitButton.addEventListener("click", () => {
        console.log("✅ Commit Button Clicked!");
    
        if (selectedDirElement.innerText.includes("No directory selected")) {
            alert("⚠️ Please select a directory first!");
            return;
        }
    
        const directoryPath = selectedDirElement.innerText.replace("📂 Selected: ", "").trim();
        console.log("📂 Sending commit window request for:", directoryPath);
    
        ipcRenderer.send("request-commit-message", directoryPath);
    });
    
    ipcRenderer.on("commit-result", (event, result) => {
        console.log("✅ Commit Result:", result);
    
        const commitResultElement = document.getElementById("commitResults");
    
        if (commitResultElement) {
            commitResultElement.innerText = `📝 Commit Status:\n${result}`;
        } else {
            console.error("❌ ERROR: 'commitResults' element not found in the DOM.");
        }
    });
    
    

    pushButton.addEventListener("click", () => {
        console.log("⬆️ Push to GitHub Clicked!");
    
        if (selectedDirElement.innerText.includes("No directory selected")) {
            alert("⚠️ Please select a directory first!");
            return;
        }
    
        const directoryPath = selectedDirElement.innerText.replace("📂 Selected: ", "").trim();
        console.log("📂 Sending push request for:", directoryPath);
    
        ipcRenderer.send("push-changes", directoryPath);
    });
    
    // Show push result in a popup
    ipcRenderer.on("push-result", (event, result) => {
        console.log("⬆️ Push Result:", result);
        alert(result);
    });
    
    
    // If no remote exists, notify the user
    ipcRenderer.on("no-git-remote", () => {
        alert("⚠️ No Git remote found! Please enter a GitHub URL.");
    });
    
    
});

const themeToggleBtn = document.getElementById("toggleTheme");

themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    // Optional: Persist in localStorage
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
});

document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
    }

    // existing setup code...
});

function storeRecentDirectory(dir) {
  let dirs = JSON.parse(localStorage.getItem("recentDirs") || "[]");

  if (!dirs.includes(dir)) {
    dirs.push(dir); // Add to list
    localStorage.setItem("recentDirs", JSON.stringify(dirs));
    renderRecentDirs();
  }
}


function renderRecentDirs() {
  const list = document.getElementById("recentDirsList");
  if (!list) return;

  const dirs = JSON.parse(localStorage.getItem("recentDirs") || "[]");
  list.innerHTML = "";

  dirs.forEach(dir => {
    const li = document.createElement("li");
    li.innerHTML = `<button class="recent-dir-button" data-path="${dir}">${dir}</button>`;
    list.appendChild(li);
  });

  // Add click listeners after rendering
  document.querySelectorAll(".recent-dir-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-path");
      console.log("🖱 Clicked recent directory:", dir);
      ipcRenderer.send("simulate-directory-selection", dir);
    });
  });
}

let selectedDirectory = "";

function renderScanHistory() {
  ipcRenderer.invoke("get-scan-history").then(history => {
    console.log("📜 Scan History:", history);

    const historyList = document.getElementById("scanHistoryList");
    if (!historyList) return;

    historyList.innerHTML = "";

    if (!history || history.length === 0) {
      const emptyMsg = document.createElement("li");
      emptyMsg.textContent = "📭 No scans yet. Run a scan to get started.";
      emptyMsg.style.color = "#777";
      historyList.appendChild(emptyMsg);
      return;
    }

    history.slice().reverse().forEach(scan => {
      const item = document.createElement("li");
      item.innerHTML = `
        <strong>${scan.path}</strong><br>
        <small>${new Date(scan.timestamp).toLocaleString()}</small><br>
        <pre>${scan.result.slice(0, 300)}...</pre>
      `;
      historyList.appendChild(item);
    });

    historyList.scrollTop = 0; // Scroll to top after update
  });
}


document.querySelectorAll(".tab-switch").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");

    // Highlight the selected tab button
    document.querySelectorAll(".tab-switch").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Show/hide tab content
    document.querySelectorAll(".tab-content").forEach(tabContent => {
      tabContent.classList.add("hidden");
    });
    document.getElementById(`${tab}Tab`).classList.remove("hidden");
  });
});

const exportButton = document.getElementById("exportScanButton");
const exportFormatSelect = document.getElementById("exportFormat");

if (exportButton && exportFormatSelect) {
  exportButton.addEventListener("click", async () => {
    const format = exportFormatSelect.value;
    console.log("⬇️ Export button clicked - format:", format);

    try {
      const result = await ipcRenderer.invoke("export-scan-history", format);
      console.log("📦 Export result:", result);
      alert(result.message);
    } catch (err) {
      console.error("❌ Export failed:", err);
      alert("An error occurred during export.");
    }
  });
}


document.addEventListener("DOMContentLoaded", () => {
  renderRecentDirs();
  renderScanHistory();
});