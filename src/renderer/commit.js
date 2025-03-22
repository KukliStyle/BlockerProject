const { ipcRenderer } = require("electron");

let selectedDirectory = "";  // Store the directory path

document.addEventListener("DOMContentLoaded", () => {
    console.log("📝 Commit Window Loaded!");

    // ✅ Send this after the renderer is fully ready
    ipcRenderer.send("commit-window-ready");

    ipcRenderer.on("set-directory-path", (event, directoryPath) => {
        selectedDirectory = directoryPath;
        console.log("📂 Commit window received directory:", selectedDirectory);
    });

    document.getElementById("submitCommit").addEventListener("click", () => {
        const commitMessage = document.getElementById("commitMessage").value.trim();

        if (!commitMessage) {
            alert("⚠️ Commit message cannot be empty!");
            return;
        }

        if (!selectedDirectory) {
            alert("⚠️ No directory selected for commit!");
            console.error("❌ Commit Error: No directory path received.");
            return;
        }

        console.log("📤 Sending commit:", { selectedDirectory, commitMessage });
        ipcRenderer.send("commit-changes", selectedDirectory, commitMessage);
        window.close();
    });

    document.getElementById("cancelCommit").addEventListener("click", () => {
        window.close();
    });
});
