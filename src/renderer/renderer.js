const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Renderer.js Loaded!");

    const selectDirButton = document.getElementById("selectDirButton");
    const scanButton = document.getElementById("scanButton");
    const commitButton = document.getElementById("commitButton");
    const pushButton = document.getElementById("pushButton");
    const selectedDirElement = document.getElementById("selectedDir");
    const scanResultsElement = document.getElementById("scanResults");

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
        console.log("🔍 Snyk Scan Result:", result);
    
        const scanResultElement = document.getElementById("scanResults");
        if (scanResultElement) {
            scanResultElement.innerText = `🔍 Snyk Scan Results:\n${result}`;
        } else {
            console.error("❌ ERROR: 'scanResults' element not found!");
        }
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
