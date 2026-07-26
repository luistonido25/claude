/* ============================================================
   GHL 30-Day Intensive — progress engine v2
   - Named profiles: all progress is namespaced per user name
   - Cloud sync via /api/progress (Netlify Function + Blobs);
     falls back to local-only silently when the API is absent
   - Per-day quizzes rendered from quizzes.js (window.GHL30_QUIZZES)
   ============================================================ */

(function () {
  "use strict";

  var PREFIX = "ghl30:";
  var API = "/api/progress";

  // Track support: GHL pages have no data-track (legacy keys stay unchanged);
  // other tracks (e.g. "make") prefix their day/quiz keys.
  var TRACK = document.body.getAttribute("data-track") || "";
  var TP = TRACK ? TRACK + ":" : "";
  var TOTAL_DAYS = parseInt(document.body.getAttribute("data-total-days") || "30", 10);
  var QUIZ_REGISTRY = { "": "GHL30_QUIZZES", "make": "MAKE_QUIZZES" };

  function quizData() {
    return window[QUIZ_REGISTRY[TRACK] || "GHL30_QUIZZES"] || {};
  }

  /* ---------- storage helpers ---------- */

  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function lsRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function currentUser() {
    return lsGet(PREFIX + "currentUser") || "";
  }

  function userKey(suffix) {
    var u = currentUser();
    return PREFIX + (u ? u + ":" : "") + suffix;
  }

  function get(suffix) { return lsGet(userKey(suffix)); }
  function set(suffix, value) { lsSet(userKey(suffix), value); scheduleSync(); }

  /* ---------- profile management ---------- */

  function normalizeName(name) {
    return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function validName(name) {
    return /^[a-z0-9 _.-]{2,40}$/.test(name);
  }

  // Move pre-profile keys (ghl30:task:..., ghl30:day:...) into the new namespace once.
  function migrateLegacyKeys(user) {
    var moved = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(PREFIX) !== 0) continue;
      var rest = k.slice(PREFIX.length);
      if (/^(task:|day:|quiz:)/.test(rest)) moved.push([k, rest]);
    }
    moved.forEach(function (pair) {
      lsSet(PREFIX + user + ":" + pair[1], lsGet(pair[0]));
      lsRemove(pair[0]);
    });
  }

  function loginAs(name, opts) {
    var user = normalizeName(name);
    if (!validName(user)) {
      alert("Please use 2-40 characters: letters, numbers, spaces, . _ -");
      return false;
    }
    var isFirstProfile = !lsGet(PREFIX + "hasProfile");
    lsSet(PREFIX + "currentUser", user);
    lsSet(PREFIX + "hasProfile", "1");
    if (isFirstProfile) migrateLegacyKeys(user);
    if (!opts || !opts.skipPull) {
      pullFromServer(function () { location.reload(); });
    }
    return true;
  }

  function promptLogin(message) {
    var name = prompt(message ||
      "Enter your name to save YOUR progress separately from other visitors.\n" +
      "(Pick something unique - the same name always loads the same progress.)");
    if (name === null) return;
    loginAs(name);
  }

  /* ---------- cloud sync ---------- */

  var syncTimer = null;
  var apiAvailable = true; // optimistic; flipped off after a network failure

  function setSyncStatus(state) {
    var el = document.querySelector(".sync-status");
    if (!el) return;
    var map = {
      saving: "Saving…",
      saved: "Saved to cloud ✓",
      local: "Saved locally (offline)",
      pulling: "Loading your progress…"
    };
    el.textContent = map[state] || "";
    el.className = "sync-status sync-" + state;
  }

  function collectSnapshot() {
    var u = currentUser();
    if (!u) return null;
    var ns = PREFIX + u + ":";
    var snap = { tasks: {}, days: {}, quizzes: {} };
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(ns) !== 0) continue;
      var rest = k.slice(ns.length);
      var v = lsGet(k);
      var m;
      if (rest.indexOf("task:") === 0 && v === "1") {
        snap.tasks[rest.slice(5)] = 1;
      } else if ((m = rest.match(/^(?:([a-z0-9]+):)?day:(\d+):pct$/))) {
        snap.days[(m[1] ? m[1] + ":" : "") + m[2]] = parseInt(v, 10) || 0;
      } else if ((m = rest.match(/^(?:([a-z0-9]+):)?quiz:(\d+)$/))) {
        snap.quizzes[(m[1] ? m[1] + ":" : "") + m[2]] = parseInt(v, 10) || 0;
      }
    }
    return snap;
  }

  function applySnapshot(snap) {
    if (!snap) return;
    var u = currentUser();
    if (!u) return;
    var ns = PREFIX + u + ":";
    Object.keys(snap.tasks || {}).forEach(function (id) {
      lsSet(ns + "task:" + id, "1"); // union merge: server-checked stays checked
    });
    Object.keys(snap.days || {}).forEach(function (d) {
      // d is "5" (GHL) or "make:5" (other tracks)
      var parts = d.indexOf(":") > -1 ? d.split(":") : ["", d];
      var lk = ns + (parts[0] ? parts[0] + ":" : "") + "day:" + parts[1] + ":pct";
      var local = parseInt(lsGet(lk) || "0", 10);
      var remote = parseInt(snap.days[d], 10) || 0;
      lsSet(lk, String(Math.max(local, remote)));
    });
    Object.keys(snap.quizzes || {}).forEach(function (d) {
      var parts = d.indexOf(":") > -1 ? d.split(":") : ["", d];
      var lk = ns + (parts[0] ? parts[0] + ":" : "") + "quiz:" + parts[1];
      var local = parseInt(lsGet(lk) || "0", 10);
      var remote = parseInt(snap.quizzes[d], 10) || 0;
      lsSet(lk, String(Math.max(local, remote)));
    });
  }

  function pullFromServer(done) {
    var u = currentUser();
    if (!u || !window.fetch) { if (done) done(); return; }
    setSyncStatus("pulling");
    fetch(API + "?user=" + encodeURIComponent(u), { method: "GET" })
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(function (data) {
        apiAvailable = true;
        applySnapshot(data);
        setSyncStatus("saved");
        if (done) done();
      })
      .catch(function () {
        apiAvailable = false;
        setSyncStatus("local");
        if (done) done();
      });
  }

  function pushToServer() {
    var u = currentUser();
    var snap = collectSnapshot();
    if (!u || !snap || !window.fetch) return;
    if (!apiAvailable) { setSyncStatus("local"); return; }
    setSyncStatus("saving");
    fetch(API + "?user=" + encodeURIComponent(u), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(snap)
    })
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        setSyncStatus("saved");
      })
      .catch(function () {
        apiAvailable = false;
        setSyncStatus("local");
      });
  }

  function scheduleSync() {
    if (!currentUser()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(pushToServer, 2000);
  }

  /* ---------- profile bar (index + day pages) ---------- */

  function renderProfileBar() {
    var bar = document.querySelector(".profile-bar");
    if (!bar) return;
    var u = currentUser();
    if (u) {
      bar.innerHTML =
        'Learning as <strong class="profile-name"></strong> ' +
        '<button type="button" class="btn-switch-user">Switch user</button> ' +
        '<span class="sync-status"></span>';
      bar.querySelector(".profile-name").textContent = u;
      bar.querySelector(".btn-switch-user").addEventListener("click", function () {
        promptLogin("Switch user - enter a name.\nThat name's saved progress will be loaded.");
      });
    } else {
      bar.innerHTML =
        '<button type="button" class="btn-switch-user btn-login">Enter your name to save progress</button>' +
        '<span class="profile-hint"> Progress is saved per name, so several people can use this site.</span>';
      bar.querySelector(".btn-login").addEventListener("click", function () {
        promptLogin();
      });
    }
  }

  /* ---------- checkbox persistence ---------- */

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

    set(TP + "day:" + day + ":pct", String(pct));

    var fill = document.querySelector(".day-progress-fill");
    var text = document.querySelector(".day-progress-text");
    if (fill) fill.style.width = pct + "%";
    if (text) text.textContent = pct + "%";
  }

  /* ---------- per-day quiz ---------- */

  function renderQuiz() {
    var day = parseInt(document.body.getAttribute("data-day") || "0", 10);
    var host = document.getElementById("daily-quiz");
    if (!day || !host) return;
    var questions = quizData()[day];
    if (!questions || !questions.length) { host.style.display = "none"; return; }

    var best = parseInt(get(TP + "quiz:" + day) || "-1", 10);
    var picked = new Array(questions.length).fill(-1);

    var html = '<h2>🧠 Day ' + day + ' self-test</h2>';
    if (best >= 0) {
      html += '<p class="quiz-best">Best score so far: <strong>' + best + "/" + questions.length + "</strong> — retake any time.</p>";
    } else {
      html += '<p class="quiz-best">Answer from memory before checking — this is interview practice.</p>';
    }
    questions.forEach(function (q, qi) {
      html += '<div class="quiz-q" data-q="' + qi + '"><p class="quiz-question">' + (qi + 1) + ". " + q.q + "</p>";
      q.options.forEach(function (opt, oi) {
        html += '<button type="button" class="quiz-opt" data-q="' + qi + '" data-o="' + oi + '">' + opt + "</button>";
      });
      html += '<p class="quiz-explain" hidden></p></div>';
    });
    html += '<button type="button" class="quiz-check" disabled>Check answers</button>' +
            '<p class="quiz-result" hidden></p>';
    host.innerHTML = html;

    host.querySelectorAll(".quiz-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var qi = parseInt(btn.getAttribute("data-q"), 10);
        var oi = parseInt(btn.getAttribute("data-o"), 10);
        picked[qi] = oi;
        host.querySelectorAll('.quiz-opt[data-q="' + qi + '"]').forEach(function (b) {
          b.classList.toggle("selected", b === btn);
        });
        host.querySelector(".quiz-check").disabled = picked.indexOf(-1) !== -1;
      });
    });

    var alreadyChecked = false;
    host.querySelector(".quiz-check").addEventListener("click", function () {
      if (alreadyChecked) { renderQuiz(); return; }
      alreadyChecked = true;
      var score = 0;
      questions.forEach(function (q, qi) {
        var wrap = host.querySelector('.quiz-q[data-q="' + qi + '"]');
        wrap.querySelectorAll(".quiz-opt").forEach(function (b) {
          var oi = parseInt(b.getAttribute("data-o"), 10);
          b.disabled = true;
          if (oi === q.correct) b.classList.add("correct");
          else if (oi === picked[qi]) b.classList.add("incorrect");
        });
        if (picked[qi] === q.correct) score++;
        var ex = wrap.querySelector(".quiz-explain");
        if (q.explain) { ex.textContent = q.explain; ex.hidden = false; }
      });
      var result = host.querySelector(".quiz-result");
      result.hidden = false;
      result.textContent = "Score: " + score + "/" + questions.length +
        (score === questions.length ? " — perfect! 🎉" :
         score >= Math.ceil(questions.length * 0.6) ? " — solid, review the misses above." :
         " — reread today's sessions, then retake.");
      var prev = parseInt(get(TP + "quiz:" + day) || "-1", 10);
      if (score > prev) set(TP + "quiz:" + day, String(score));
      this.textContent = "Retake quiz";
      this.disabled = false;
      updateQuizBadge();
    });

    updateQuizBadge();
  }

  function updateQuizBadge() {
    var day = document.body.getAttribute("data-day");
    if (!day) return;
    var badge = document.querySelector(".quiz-score-badge");
    var questions = quizData()[parseInt(day, 10)] || [];
    if (!badge || !questions.length) return;
    var best = parseInt(get(TP + "quiz:" + day) || "-1", 10);
    badge.textContent = best >= 0 ? "🧠 Quiz: " + best + "/" + questions.length : "";
  }

  /* ---------- index page ---------- */

  function updateIndex() {
    if (document.body.getAttribute("data-page") !== "index") return;

    var sum = 0;
    var daysDone = 0;

    for (var d = 1; d <= TOTAL_DAYS; d++) {
      var pct = parseInt(get(TP + "day:" + d + ":pct") || "0", 10);
      sum += pct;
      if (pct === 100) daysDone++;

      var badge = document.querySelector('.day-pct[data-day="' + d + '"]');
      if (badge) {
        var quizBest = parseInt(get(TP + "quiz:" + d) || "-1", 10);
        var label = pct === 100 ? "✓ Done" : pct + "%";
        if (quizBest >= 0) label += " · 🧠" + quizBest + "/5";
        badge.textContent = label;
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

  /* ---------- reset (active profile only) ---------- */

  function initReset() {
    var btn = document.querySelector(".btn-reset");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var u = currentUser();
      var label = u ? 'progress for "' + u + '"' : "ALL local progress";
      if (!confirm("Reset " + label + "? This clears every checkbox and quiz score.")) return;
      var ns = u ? PREFIX + u + ":" : PREFIX;
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(ns) !== 0) continue;
        if (!u && /^(currentUser|hasProfile)$/.test(k.slice(PREFIX.length))) continue;
        toRemove.push(k);
      }
      toRemove.forEach(lsRemove);
      if (u) pushToServer();
      setTimeout(function () { location.reload(); }, 300);
    });
  }

  /* ---------- boot ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    renderProfileBar();
    initCheckboxes();
    updateDayProgress();
    renderQuiz();
    updateIndex();
    initReset();
    if (currentUser()) {
      pullFromServer(function () {
        // re-apply after merge so late-arriving server data shows up
        initCheckboxesRefresh();
        updateDayProgress();
        updateIndex();
        updateQuizBadge();
      });
    }
  });

  function initCheckboxesRefresh() {
    document.querySelectorAll('input[type="checkbox"][data-task]').forEach(function (box) {
      if (get("task:" + box.getAttribute("data-task")) === "1") box.checked = true;
    });
  }
})();
