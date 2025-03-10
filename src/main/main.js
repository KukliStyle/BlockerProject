const { app } = require("electron");
const { createMainWindow } = require("./windowManager");
require("./ipcHandlers"); // Loads all IPC logic

app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
