const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
  const exportButton = document.getElementById("exportScanButton");
  const exportFormat = document.getElementById("exportFormat");
  const themeToggleBtn = document.getElementById("toggleTheme");

  // Load and apply saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }

  // Theme toggle handler
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const isDark = document.body.classList.contains("dark-mode");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  } else {
    console.warn("⚠️ No toggleTheme button found.");
  }

  // Export button handler
  if (exportButton && exportFormat) {
    exportButton.addEventListener("click", async () => {
      const format = exportFormat.value;
      console.log("⬇ Exporting history in format:", format);

      try {
        const result = await ipcRenderer.invoke("export-scan-history", format);
        console.log("📦 Export result:", result);
        alert(result.message);
      } catch (err) {
        console.error("❌ Export failed:", err);
        alert("Something went wrong while exporting.");
      }
    });
  } else {
    console.warn("❌ Export elements not found!");
  }

  renderScanHistory();
});

function renderScanHistory() {
  ipcRenderer.invoke("get-scan-history").then(history => {
    const list = document.getElementById("scanHistoryList");
    if (!list) return;

    list.innerHTML = "";

    if (!history || history.length === 0) {
      list.innerHTML = "<li>No scan history found.</li>";
      return;
    }

    history.reverse().forEach(scan => {
      const item = document.createElement("li");
      item.innerHTML = `
        <strong>${scan.path}</strong><br>
        <small>${new Date(scan.timestamp).toLocaleString()}</small><br>
        <pre>${scan.result.slice(0, 300)}...</pre>
      `;
      list.appendChild(item);
    });
  });
}
