const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("gitLogList");
  const searchInput = document.getElementById("logSearch");
  const selectedDirectory = localStorage.getItem("lastSelectedDir");

  if (!selectedDirectory) {
    list.innerHTML = "<li>⚠️ No directory selected.</li>";
    return;
  }

  ipcRenderer.invoke("get-git-log", selectedDirectory).then(commits => {
    renderLog(commits);

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      const filtered = commits.filter(commit =>
        commit.message.toLowerCase().includes(query) ||
        commit.author.toLowerCase().includes(query) ||
        commit.hash.includes(query)
      );
      renderLog(filtered);
    });
  }).catch(err => {
    console.error("❌ Failed to load git log:", err);
    list.innerHTML = "<li>❌ Failed to load git log.</li>";
  });

  function renderLog(commits) {
    list.innerHTML = "";

    if (!commits || commits.length === 0) {
      list.innerHTML = "<li>📭 No commits found in this repo.</li>";
      return;
    }

    commits.forEach(commit => {
      const li = document.createElement("li");
      li.classList.add("log-entry");

      li.innerHTML = `
        <strong>${commit.message}</strong><br>
        <small><code>${commit.hash.slice(0, 7)}</code> by ${commit.author} on ${commit.date}</small>
        <details>
          <summary>View Diff</summary>
          <pre>${commit.diff || "No diff available"}</pre>
        </details>
      `;

      list.appendChild(li);
    });
  }
});

function storeRecentDirectory(dir) {
  let dirs = JSON.parse(localStorage.getItem("recentDirs") || "[]");

  if (!dirs.includes(dir)) {
    dirs.push(dir);
    localStorage.setItem("recentDirs", JSON.stringify(dirs));
    renderRecentDirs();
  }
}

function renderRecentDirs() {
  const list = document.getElementById("recentDirsList");
  if (!list) return;

  const dirs = JSON.parse(localStorage.getItem("recentDirs") || "[]");
  list.innerHTML = "";

  dirs.forEach(dir => {
    const li = document.createElement("li");
    li.innerHTML = `<button class="recent-dir-button" data-path="${dir}">${dir}</button>`;
    list.appendChild(li);
  });

  document.querySelectorAll(".recent-dir-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-path");
      console.log("🖱 Clicked recent directory:", dir);
      localStorage.setItem("lastSelectedDir", dir);
      ipcRenderer.send("simulate-directory-selection", dir);
      location.reload(); // Optional: refresh to reload git log
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderRecentDirs();
});

document.addEventListener("DOMContentLoaded", () => {
  // Load saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }

  // Toggle theme
  const themeToggleBtn = document.getElementById("toggleTheme");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const isDark = document.body.classList.contains("dark-mode");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }
});
