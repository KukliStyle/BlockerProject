const { ipcMain, dialog } = require("electron");  //  Ensure dialog is imported
const { checkGitRepo, checkGitStatus, commitChanges, pushChanges ,setGitRemote ,checkGitRemote, ensureBranchAndCommit ,ensureBranchExists , ensureCommitExists } = require("./git");
const { runSnykScan } = require("./snyk");
const { createCommitWindow, createRemoteWindow } = require("./windowManager");

ipcMain.on("open-directory-dialog", async (event) => {
    console.log("📂 Received 'open-directory-dialog' event");

    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        console.log("📂 Directory Selected:", result.filePaths[0]);  // Debugging
        event.reply("selected-directory", result.filePaths[0]);  //  Send to renderer
    } else {
        console.log("⚠️ Directory selection was canceled");
    }
});

ipcMain.on("check-git-repo", (event, directory) => {
    checkGitRepo(directory, (error, result) => event.reply("git-repo-status", !error));
});


ipcMain.on("run-snyk-scan", (event, directoryPath) => {
    console.log("🔍 Snyk Scan Requested for:", directoryPath);

    if (!directoryPath) {
        event.reply("snyk-scan-result", "⚠️ No directory selected!");
        return;
    }

    runSnykScan(directoryPath, (scanResult) => {
        console.log("🔍 Snyk Scan Complete:\n", scanResult);
        event.reply("snyk-scan-result", scanResult);
    });
});

ipcMain.on("request-commit-message", (event, directoryPath) => {
    console.log("📝 Opening Commit Window for:", directoryPath);

    if (!directoryPath) {
        console.warn("⚠️ No directory selected! Cannot commit.");
        event.reply("commit-result", "⚠️ Please select a directory first!");
        return;
    }

    //  Open the commit message window
    createCommitWindow();

    //  Ensure the commit window receives the directory path
    ipcMain.once("commit-window-ready", (commitEvent) => {
        console.log("📂 Sending directory to commit window:", directoryPath);
        commitEvent.sender.send("set-directory-path", directoryPath);
    });
});



ipcMain.on("commit-changes", (event, directoryPath, commitMessage) => {
    console.log(`🔹 Attempting commit in: ${directoryPath} with message: "${commitMessage}"`);

    if (!directoryPath) {
        dialog.showMessageBox({
            type: "warning",
            title: "Commit Error",
            message: "⚠️ No directory selected!",
            buttons: ["OK"]
        });
        return;
    }

    if (!commitMessage) {
        dialog.showMessageBox({
            type: "warning",
            title: "Commit Error",
            message: "⚠️ Commit message cannot be empty!",
            buttons: ["OK"]
        });
        return;
    }

    commitChanges(directoryPath, commitMessage, (error, result) => {
        let message = "";
        let type = "info";

        if (error) {
            console.error("❌ Commit Error:", error);
            message = `❌ Commit Failed: ${error.message}`;
            type = "error";
        } else {
            console.log("✅ Commit Result:", result);
            message = result.includes("nothing to commit") 
                ? "⚠️ No changes detected. Nothing to commit." 
                : `Commit message:\n${result}`;
        }

        dialog.showMessageBox({
            type: type,
            title: "Commit Status",
            message: message,
            buttons: ["OK"]
        });

        event.reply("commit-result", message);  //  Send result back to renderer
    });
});


ipcMain.on("push-changes", (event, directoryPath) => {
    console.log("⬆️ Push request received for:", directoryPath);

    if (!directoryPath) {
        dialog.showMessageBox({
            type: "warning",
            title: "Push Error",
            message: "⚠️ No directory selected!",
            buttons: ["OK"]
        });
        return;
    }

    //  Step 1: Check if remote is set
    checkGitRemote(directoryPath, (remoteUrl, hasRemote) => {
        if (!hasRemote) {
            console.log("⚠️ No remote found. Opening remote setup window.");
            createRemoteWindow();
            event.reply("no-git-remote"); // Tell renderer to open remote input
        } else {
            console.log("✅ Remote found:", remoteUrl);

            //  Step 2: Ensure branch and commit exist before pushing
            ensureBranchAndCommit(directoryPath, (error, branch) => {
                if (error) {
                    console.error("❌ Error ensuring branch & commit:", error);
                    dialog.showMessageBox({
                        type: "error",
                        title: "Push Failed",
                        message: `❌ ${error.message}`,
                        buttons: ["OK"]
                    });
                    event.reply("push-result", `❌ Push Failed: ${error.message}`);
                    return;
                }

                console.log("📂 Ready to push to branch:", branch);

                // Step 3: Push changes
                pushChanges(directoryPath, branch, (error, result) => {
                    let message = "";
                    let type = "info";

                    if (error) {
                        console.error("❌ Push Error:", error);
                        message = `❌ Push Failed: ${error.message}`;
                        type = "error";
                    } else {
                        console.log("✅ Push Successful:\n", result);
                        message = `✅ Push Successful:\n${result}`;
                    }

                    dialog.showMessageBox({
                        type: type,
                        title: "Push Status",
                        message: message,
                        buttons: ["OK"]
                    });

                    event.reply("push-result", message);
                });
            });
        }
    });
});

//  Handle setting the remote
ipcMain.on("set-git-remote", (event, directoryPath, remoteUrl) => {
    console.log("🌍 Setting Git remote for:", directoryPath, "➡️", remoteUrl);

    setGitRemote(directoryPath, remoteUrl, (error, result) => {
        let message = "";
        let type = "info";

        if (error) {
            console.error("❌ Failed to set remote:", error);
            message = `❌ Failed to add remote: ${error.message}`;
            type = "error";
        } else {
            console.log("✅ Remote successfully added:", remoteUrl);
            message = `✅ Remote added successfully!\nYou can now push your changes.`;
        }

        dialog.showMessageBox({
            type: type,
            title: "Remote Setup",
            message: message,
            buttons: ["OK"]
        });

        event.reply("remote-setup-result", message);
    });
});
