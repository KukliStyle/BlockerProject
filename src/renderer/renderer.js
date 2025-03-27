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

     // Receive selected directory
     ipcRenderer.on("selected-directory", (event, path) => {
        console.log("📂 Selected Directory:", path);
        selectedDirElement.innerText = `📂 Selected: ${path}`;

        // ✅ Enable buttons after directory is selected
        scanButton.disabled = false;
        commitButton.disabled = false;
        pushButton.disabled = false;
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
