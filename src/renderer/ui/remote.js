const { ipcRenderer } = require("electron");

let selectedDirectory = "";

ipcRenderer.on("set-directory-path", (event, directoryPath) => {
    selectedDirectory = directoryPath;
    console.log("📂 Selected directory for remote:", selectedDirectory);
});

document.getElementById("submitRemote").addEventListener("click", () => {
    const remoteUrl = document.getElementById("remoteUrl").value.trim();
    if (!remoteUrl) {
        document.getElementById("remoteResult").innerText = "⚠️ Please enter a valid GitHub URL.";
        return;
    }

    if (!selectedDirectory) {
        document.getElementById("remoteResult").innerText = "⚠️ No directory selected.";
        return;
    }

    ipcRenderer.send("add-git-remote-and-push", selectedDirectory, remoteUrl);
    window.close(); // Close the popup after submitting
});

document.getElementById("cancelRemote").addEventListener("click", () => {
    window.close();
});
