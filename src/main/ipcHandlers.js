const { ipcMain, dialog } = require("electron");  //  Ensure dialog is imported
const { checkGitRepo, checkGitStatus, commitChanges, pushChanges ,setGitRemote ,checkGitRemote, ensureBranchAndCommit ,ensureBranchExists , ensureCommitExists, isBranchBehindRemote, pullLatestChanges } = require("./git");
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

    // ✅ Step 1: Run Snyk scan first
    runSnykScan(directoryPath, (scanResult) => {
        console.log("🔍 Pre-push Snyk Scan Result:\n", scanResult);

        const hasMediumOrHigh = /(?:(High|Medium)\s+severity)/i.test(scanResult);
        if (hasMediumOrHigh) {
            dialog.showMessageBox({
                type: "error",
                title: "Push Blocked",
                message: "❌ Push blocked due to Medium or High severity vulnerabilities.\nPlease resolve them before pushing.",
                buttons: ["OK"]
            });

            event.reply("push-result", "❌ Push blocked: vulnerabilities detected.");
            return; // ✅ Prevents any push logic from continuing
        }

        // ✅ Step 2: Continue with remote + branch checks
        checkGitRemote(directoryPath, (remoteUrl, hasRemote) => {
            if (!hasRemote) {
                createRemoteWindow();
                event.reply("no-git-remote");
                return;
            }

            ensureBranchAndCommit(directoryPath, (error, branch) => {
                if (error) {
                    dialog.showMessageBox({
                        type: "error",
                        title: "Push Failed",
                        message: `❌ ${error.message}`,
                        buttons: ["OK"]
                    });
                    event.reply("push-result", `❌ Push Failed: ${error.message}`);
                    return;
                }

                isBranchBehindRemote(directoryPath, branch, (err, behind) => {
                    if (err) {
                        event.reply("push-result", `❌ Could not check remote status.`);
                        return;
                    }

                    if (behind) {
                        dialog.showMessageBox({
                            type: "question",
                            title: "Branch Behind Remote",
                            message: "⚠️ Your branch is behind the remote.\nDo you want to pull the latest changes now?",
                            buttons: ["Yes", "No"],
                            defaultId: 0,
                            cancelId: 1
                        }).then(({ response }) => {
                            if (response === 0) {
                                pullLatestChanges(directoryPath, (pullErr, pullResult) => {
                                    if (pullErr) {
                                        dialog.showMessageBox({
                                            type: "error",
                                            title: "Pull Failed",
                                            message: `❌ Pull failed:\n${pullErr.message}`,
                                            buttons: ["OK"]
                                        });
                                        event.reply("push-result", "❌ Pull failed. Resolve conflicts manually.");
                                        return;
                                    }

                                    console.log("✅ Pull Successful. Proceeding to push...");
                                    pushChanges(directoryPath, branch, (error, result) => {
                                        let message = "";
                                        let type = "info";

                                        if (error) {
                                            message = `❌ Push Failed: ${error.message}`;
                                            type = "error";
                                        } else {
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
                            } else {
                                event.reply("push-result", "⚠️ Push canceled: Branch is behind.");
                            }
                        });

                        return; // ✅ Critical: prevents fallthrough push
                    }

                    // ✅ Final push if branch is up-to-date
                    pushChanges(directoryPath, branch, (error, result) => {
                        let message = "";
                        let type = "info";

                        if (error) {
                            message = `❌ Push Failed: ${error.message}`;
                            type = "error";
                        } else {
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
            });
        });
    });
});

ipcMain.on("commit-changes", (event, directoryPath, commitMessage) => {
    console.log(`📝 Received commit for: ${directoryPath} with message: "${commitMessage}"`);

    if (!directoryPath) {
        dialog.showMessageBoxSync({
            type: "warning",
            title: "Commit Error",
            message: "⚠️ No directory selected!",
            buttons: ["OK"]
        });
        return;
    }

    if (!commitMessage) {
        dialog.showMessageBoxSync({
            type: "warning",
            title: "Commit Error",
            message: "⚠️ Commit message cannot be empty!",
            buttons: ["OK"]
        });
        return;
    }

    // Run Snyk scan before commit
    runSnykScan(directoryPath, (scanResult) => {
        console.log("🔍 Pre-commit Snyk Scan Result:\n", scanResult);

        const hasMediumOrHigh = /(?:(High|Medium)\s+severity)/i.test(scanResult);
        if (hasMediumOrHigh) {
            dialog.showMessageBoxSync({
                type: "error",
                title: "Commit Blocked",
                message: "❌ Commit blocked due to Medium or High severity vulnerabilities.\nPlease resolve them before committing.",
                buttons: ["OK"]
            });
            event.reply("commit-result", "❌ Commit blocked: vulnerabilities detected.");
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
                message = result.includes("nothing to commit")
                    ? "⚠️ No changes detected. Nothing to commit."
                    : `✅ Commit Successful:\n${result}`;
            }

            dialog.showMessageBoxSync({
                type: type,
                title: "Commit Status",
                message: message,
                buttons: ["OK"]
            });

            event.reply("commit-result", message);
        });
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
