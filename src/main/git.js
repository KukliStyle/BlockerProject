const { exec } = require("child_process");

function executeCommand(command, callback) {
    exec(command, (error, stdout, stderr) => {
        callback(error, stdout || stderr);
    });
}

function checkGitRepo(directory, callback) {
    executeCommand(`cd "${directory}" && git rev-parse --is-inside-work-tree`, callback);
}


// Function to check for uncommitted changes
function checkGitStatus(directoryPath, callback) {
    exec(`cd "${directoryPath}" && git status --porcelain`, (error, stdout) => {
        if (error) {
            console.error("❌ Git Status Error:", error);
            callback(error, null);
        } else {
            callback(null, stdout.trim()); // Returns the status output
        }
    });
}

// Function to commit changes
function commitChanges(directoryPath, commitMessage, callback) {
    checkGitStatus(directoryPath, (error, status) => {
        if (error) {
            callback(error, null);
            return;
        }

        if (!status) {
            console.log("⚠️ No changes to commit.");
            callback(null, "⚠️ No changes detected. Nothing to commit.");
            return;
        }

        console.log(`🔹 Running Git Commit in: ${directoryPath} with message: "${commitMessage}"`);
        exec(`cd "${directoryPath}" && git add . && git commit -m "${commitMessage}"`, (commitError, stdout, stderr) => {
            if (commitError) {
                console.error("❌ Git Commit Error:", stderr);
                callback(commitError, null);
            } else {
                console.log("✅ Git Commit Successful:\n", stdout);
                callback(null, stdout);
            }
        });
    });
}

// Function to check if the repository has a remote
function checkGitRemote(directoryPath, callback) {
    exec(`cd "${directoryPath}" && git remote get-url origin`, (error, stdout, stderr) => {
        if (error) {
            console.warn("⚠️ No Git remote found:", stderr);
            callback(null, false);  // No remote found
        } else {
            console.log("✅ Git remote URL:", stdout.trim());
            callback(stdout.trim(), true);  // Remote found
        }
    });
}

// Function to set a Git remote (user provides URL)
function setGitRemote(directoryPath, remoteUrl, callback) {
    exec(`cd "${directoryPath}" && git remote add origin ${remoteUrl}`, (error, stdout, stderr) => {
        if (error) {
            console.error("❌ Failed to add remote:", stderr);
            callback(error, null);
        } else {
            console.log("✅ Remote added:", remoteUrl);
            callback(null, stdout);
        }
    });
}

//  Get the current branch (or create 'main' if none exists)
function getCurrentBranch(directoryPath, callback) {
    exec(`cd "${directoryPath}" && git rev-parse --abbrev-ref HEAD`, (error, stdout, stderr) => {
        if (error) {
            console.error("❌ Error getting current branch:", stderr);
            callback(null, "main"); // Default to 'main' if error occurs
        } else {
            const branch = stdout.trim();
            console.log("📂 Current branch detected:", branch);
            callback(null, branch);
        }
    });
}

function isBranchBehindRemote(directoryPath, branch, callback) {
    const cmd = `cd "${directoryPath}" && git fetch && git status -uno`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error("❌ Error checking sync status:", stderr);
            callback(error, null);
        } else {
            const behind = stdout.includes("Your branch is behind");
            callback(null, behind);
        }
    });
}


// ✅ Ensure a branch exists (create 'main' if missing)
function ensureBranchExists(directoryPath, callback) {
    getCurrentBranch(directoryPath, (error, branch) => {
        if (error) {
            callback(error, null);
            return;
        }

        if (branch === "") {
            console.log("⚠️ No branch found, creating 'main' branch...");
            exec(`cd "${directoryPath}" && git checkout -b main`, (createError, stdout, stderr) => {
                if (createError) {
                    console.error("❌ Error creating 'main' branch:", stderr);
                    callback(createError, null);
                } else {
                    console.log("✅ 'main' branch created and switched.");
                    callback(null, "main");
                }
            });
        } else {
            callback(null, branch);
        }
    });
}

// ✅ Ensure there is at least one commit before pushing
function ensureCommitExists(directoryPath, callback) {
    exec(`cd "${directoryPath}" && git log --oneline`, (error, stdout, stderr) => {
        if (error || !stdout.trim()) {
            console.log("⚠️ No commits found. Creating an initial commit...");
            exec(`cd "${directoryPath}" && git commit --allow-empty -m "Initial commit"`, (commitError, commitStdout, commitStderr) => {
                if (commitError) {
                    console.error("❌ Error creating initial commit:", commitStderr);
                    callback(commitError, null);
                } else {
                    console.log("✅ Initial commit created.");
                    callback(null, "Initial commit created.");
                }
            });
        } else {
            callback(null, "Commit already exists.");
        }
    });
}

// ✅ Ensure both branch and commit exist
function ensureBranchAndCommit(directoryPath, callback) {
    ensureBranchExists(directoryPath, (branchError, branch) => {
        if (branchError) {
            callback(branchError, null);
            return;
        }

        ensureCommitExists(directoryPath, (commitError) => {
            if (commitError) {
                callback(commitError, null);
                return;
            }

            callback(null, branch); // Return the correct branch to use for push
        });
    });
}

// ✅ Push changes to the correct branch
function pushChanges(directoryPath, branch, callback) {
    console.log(`⬆️ Pushing to '${branch}' branch...`);

    exec(`cd "${directoryPath}" && git push -u origin ${branch}`, (pushError, stdout, stderr) => {
        if (pushError) {
            console.error("❌ Git Push Error:", stderr);
            callback(pushError, null);
        } else {
            console.log("✅ Git Push Successful:\n", stdout);
            callback(null, stdout);
        }
    });
}

function pullLatestChanges(directoryPath, callback) {
    const cmd = `cd "${directoryPath}" && git pull --rebase`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error("❌ Git Pull Error:", stderr);
            callback(error, null);
        } else {
            console.log("✅ Git Pull Successful:\n", stdout);
            callback(null, stdout);
        }
    });
}


module.exports = { checkGitRepo, checkGitStatus, commitChanges, pushChanges , checkGitRemote , setGitRemote , ensureBranchAndCommit , ensureBranchExists ,ensureCommitExists ,isBranchBehindRemote, pullLatestChanges};
