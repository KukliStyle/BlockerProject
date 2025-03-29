const { app, ipcMain } = require("electron");
const { createMainWindow } = require("./WindowManager.js");
require("./ipcHandlers"); // Loads all IPC logic

app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

ipcMain.on("simulate-directory-selection", (event, directoryPath) => {
  console.log("🔁 Simulating selection of recent directory:", directoryPath);
  event.sender.send("selected-directory", directoryPath);
});
