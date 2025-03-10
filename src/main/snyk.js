const { exec } = require("child_process");

function runSnykScan(directoryPath, callback) {
    console.log("🔍 Running Snyk scan on:", directoryPath);

    exec(`cd "${directoryPath}" && npx snyk test`, (error, stdout, stderr) => {
        if (error) {
            console.error("❌ Snyk Scan Error:", stderr);
            callback(`❌ Snyk Scan Failed: ${stderr}`);
        } else {
            console.log("✅ Snyk Scan Output:\n", stdout);
            callback(stdout);
        }
    });
}

module.exports = { runSnykScan };
