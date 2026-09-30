function contributionLevel(count, max) {
  if (!count) return 0;
  if (max <= 0) return 1;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function formatMonthLabels(weeks) {
  const labels = [];
  let lastMonth = null;

  weeks.forEach((week, index) => {
    const day = week.days?.[0];
    if (!day?.date) return;
    const month = new Date(`${day.date}T12:00:00`).toLocaleString("en-US", {
      month: "short",
    });
    if (month !== lastMonth) {
      labels.push({ index, label: month });
      lastMonth = month;
    }
  });

  return labels;
}

function animateHeatmapCells(container) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const cells = [
    ...container.querySelectorAll(".git-cell[data-level]:not([data-level='0'])"),
  ];
  cells.forEach((cell) => {
    const delay = Math.random() * 900;
    setTimeout(() => {
      cell.classList.add("git-cell-pop");
      cell.addEventListener(
        "animationend",
        () => cell.classList.remove("git-cell-pop"),
        { once: true }
      );
    }, delay);
  });
}

async function renderHeatmap() {
  const container = document.getElementById("heatmap");
  const countEl = document.getElementById("contrib-count");
  const monthsEl = document.getElementById("contrib-months");
  if (!container) return;

  try {
    const response = await fetch("./js/contributions.json", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const weeks = data.weeks || [];
    const max = Math.max(
      0,
      ...weeks.flatMap((week) => (week.days || []).map((d) => d.count || 0))
    );

    if (countEl) {
      const total = data.totalContributions ?? 0;
      countEl.textContent = `${total.toLocaleString()} contributions in the last year`;
      countEl.classList.remove("is-error");
    }

    container.classList.remove("is-loading");
    container.removeAttribute("aria-hidden");
    container.innerHTML = weeks
      .map((week) => {
        const days = (week.days || [])
          .map((day) => {
            const level = contributionLevel(day.count || 0, max);
            const label = `${day.count || 0} contribution${
              day.count === 1 ? "" : "s"
            } on ${day.date}`;
            return `<div class="git-cell" data-level="${level}" title="${label}" aria-label="${label}"></div>`;
          })
          .join("");
        return `<div class="git-week">${days}</div>`;
      })
      .join("");

    if (monthsEl) {
      const labels = formatMonthLabels(weeks);
      const cell = 13;
      monthsEl.innerHTML = labels
        .map(({ index, label }, i) => {
          const next = labels[i + 1]?.index ?? weeks.length;
          const span = Math.max(1, next - index);
          return `<span style="flex: ${span} 0 0; min-width: ${
            span * cell
          }px">${label}</span>`;
        })
        .join("");
    }

    animateHeatmapCells(container);
  } catch (error) {
    console.error("Failed to load GitHub contributions:", error);
    container.classList.remove("is-loading");
    container.innerHTML = "";
    if (countEl) {
      countEl.textContent = "Unable to load GitHub contributions.";
      countEl.classList.add("is-error");
    }
  }
}

function getIsDark() {
  return document.documentElement.classList.contains("dark");
}

function setTheme(dark) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch (e) {}
  updateToggleLabel();
}

function updateToggleLabel() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const dark = getIsDark();
  btn.textContent = dark ? "light" : "dark";
  btn.setAttribute("aria-pressed", String(dark));
}

function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  updateToggleLabel();
  btn.addEventListener("click", () => setTheme(!getIsDark()));
}

function currentPageId() {
  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (file === "work.html") return "work";
  if (file === "play.html") return "play";
  if (file === "about.html") return "about";
  return "home";
}

function initDock() {
  const page = currentPageId();
  document.querySelectorAll(".dock-item").forEach((item) => {
    if (item.dataset.page === page) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function initWorkRows() {
  document.querySelectorAll(".work-row").forEach((btn) => {
    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      const next = !expanded;
      btn.setAttribute("aria-expanded", String(next));
      const id = btn.getAttribute("aria-controls");
      const panel = id ? document.getElementById(id) : null;
      if (panel) panel.hidden = !next;
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initDock();
  initWorkRows();
  renderHeatmap();
});
