const { spawn } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");

function runSnykScan(directoryPath, callback) {
    console.log("🔍 Starting Snyk scan on:", directoryPath);

    //Check if package.json exists
    const packageJsonPath = path.join(directoryPath, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
        callback("⚠️ No package.json found in selected directory.\nSnyk requires a valid project to scan.");
        return;
    }

    //Check if node_modules exists
    const nodeModulesPath = path.join(directoryPath, "node_modules");
    if (!fs.existsSync(nodeModulesPath)) {
        callback("⚠️ Missing node_modules folder. Run `npm install` in this directory before scanning.");
        return;
    }

    //Check if npx is available
    const isWindows = os.platform() === "win32";
    const checkCommand = isWindows ? "where" : "which";

    const checkNpx = spawn(checkCommand, ["npx"]);
    checkNpx.on("close", (code) => {
        if (code !== 0) {
            callback("❌ `npx` not found. Make sure Node.js and npm are installed and added to your PATH.");
            return;
        }

        //Proceed with scan if everything checks out
        const command = isWindows ? "cmd.exe" : "npx";
        const args = isWindows ? ["/c", "npx", "snyk", "test"] : ["snyk", "test"];

        const snykProcess = spawn(command, args, {
            cwd: directoryPath,
            env: process.env,
            shell: false
        });

        let output = "";
        let errorOutput = "";

        snykProcess.stdout.on("data", (data) => {
            output += data.toString();
        });

        snykProcess.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        snykProcess.on("close", (code) => {
            if (code !== 0) {
                const combined = (errorOutput + output).trim();

                if (combined.includes("Missing node_modules")) {
                    callback("⚠️ No `node_modules` found. Run `npm install` in the selected directory.");
                } else if (combined.includes("Failed to read") && combined.includes("package.json")) {
                    callback("❌ Invalid or corrupt `package.json`. Please fix it before scanning.");
                } else {
                    callback(`❌ Snyk Scan Failed:\n${combined}`);
                }
            } else {
                callback(output);
            }
        });
    });
}

module.exports = { runSnykScan };
