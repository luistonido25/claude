/* ============================================================
   GHL 30-Day Intensive — progress engine
   - Persists every checkbox with a data-task id to localStorage
   - Day pages  (<body data-day="N">): updates the day progress bar
     and stores the day's % so the index can show it
   - Index page (<body data-page="index">): renders per-day % on the
     day cards and an overall program progress bar
   ============================================================ */

(function () {
  "use strict";

  var PREFIX = "ghl30:";
  var TOTAL_DAYS = 30;

  function get(key) {
    try { return localStorage.getItem(PREFIX + key); } catch (e) { return null; }
  }

  function set(key, value) {
    try { localStorage.setItem(PREFIX + key, value); } catch (e) { /* private mode */ }
  }

  /* ---------- checkbox persistence (day tasks + portfolio items) ---------- */

  function initCheckboxes() {
    var boxes = document.querySelectorAll('input[type="checkbox"][data-task]');
    boxes.forEach(function (box) {
      var id = box.getAttribute("data-task");
      if (get("task:" + id) === "1") box.checked = true;
      box.addEventListener("change", function () {
        set("task:" + id, box.checked ? "1" : "0");
        updateDayProgress();
        updatePortfolioCount();
      });
    });
    return boxes;
  }

  /* ---------- day page progress ---------- */

  function updateDayProgress() {
    var day = document.body.getAttribute("data-day");
    if (!day) return;

    var boxes = document.querySelectorAll('input[type="checkbox"][data-task]');
    if (!boxes.length) return;

    var checked = 0;
    boxes.forEach(function (b) { if (b.checked) checked++; });
    var pct = Math.round((checked / boxes.length) * 100);

    set("day:" + day + ":pct", String(pct));

    var fill = document.querySelector(".day-progress-fill");
    var text = document.querySelector(".day-progress-text");
    if (fill) fill.style.width = pct + "%";
    if (text) text.textContent = pct + "%";
  }

  /* ---------- index page ---------- */

  function updateIndex() {
    if (document.body.getAttribute("data-page") !== "index") return;

    var sum = 0;
    var daysDone = 0;

    for (var d = 1; d <= TOTAL_DAYS; d++) {
      var pct = parseInt(get("day:" + d + ":pct") || "0", 10);
      sum += pct;
      if (pct === 100) daysDone++;

      var badge = document.querySelector('.day-pct[data-day="' + d + '"]');
      if (badge) {
        badge.textContent = pct === 100 ? "✓ Done" : pct + "%";
        badge.classList.toggle("done", pct === 100);
      }
      var fill = document.querySelector('.day-card-fill[data-day="' + d + '"]');
      if (fill) fill.style.width = pct + "%";
    }

    var overall = Math.round(sum / TOTAL_DAYS);
    var overallFill = document.querySelector(".overall-progress-fill");
    var overallText = document.querySelector(".overall-progress-text");
    var daysDoneEl = document.querySelector(".days-done-count");
    if (overallFill) overallFill.style.width = overall + "%";
    if (overallText) overallText.textContent = overall + "%";
    if (daysDoneEl) daysDoneEl.textContent = String(daysDone);

    updatePortfolioCount();
  }

  function updatePortfolioCount() {
    var pfBoxes = document.querySelectorAll('.pf-list input[type="checkbox"][data-task]');
    var countEl = document.querySelector(".pf-done-count");
    if (!pfBoxes.length || !countEl) return;
    var done = 0;
    pfBoxes.forEach(function (b) { if (b.checked) done++; });
    countEl.textContent = done + " / " + pfBoxes.length;
  }

  /* ---------- reset ---------- */

  function initReset() {
    var btn = document.querySelector(".btn-reset");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (!confirm("Reset ALL progress? This clears every checkbox on every day.")) return;
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) toRemove.push(k);
      }
      toRemove.forEach(function (k) { localStorage.removeItem(k); });
      location.reload();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initCheckboxes();
    updateDayProgress();
    updateIndex();
    initReset();
  });
})();
