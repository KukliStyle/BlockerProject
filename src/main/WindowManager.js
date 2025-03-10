const { BrowserWindow } = require("electron");
const path = require("path");

let mainWindow;
let commitWindow;
let remoteWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
    });
    mainWindow.loadFile(path.join(__dirname, "../renderer/ui/index.html"));
}

function createCommitWindow() {
    commitWindow = new BrowserWindow({
        width: 400,
        height: 200,
        modal: true,
        parent: mainWindow,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
    });
    commitWindow.loadFile(path.join(__dirname, "../renderer/ui/commit.html"));
}

function createRemoteWindow() {
    remoteWindow = new BrowserWindow({
        width: 400,
        height: 200,
        modal: true,
        parent: mainWindow,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
    });
    remoteWindow.loadFile(path.join(__dirname, "../renderer/ui/remote.html"));
}

module.exports = { createMainWindow, createCommitWindow, createRemoteWindow };
