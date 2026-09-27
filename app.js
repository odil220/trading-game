var views = ["market", "own", "mines", "shop", "black", "profile"];
var currentView = "market";
var segAnimX = null;
var segAnimW = null;
var tickCount = 0;
var lastTick = 0;

function movePill(btn, instant) {
  var pill = document.getElementById("segPill");
  var x = btn.offsetLeft;
  var w = btn.offsetWidth;
  var curX = parseFloat(pill.dataset.x || x);
  var curW = parseFloat(pill.dataset.w || w);
  pill.dataset.x = x;
  pill.dataset.w = w;

  if (instant || reduced) {
    pill.style.width = w + "px";
    pill.style.transform = "translate3d(" + x + "px,0,0)";
    return;
  }
  if (segAnimX) segAnimX.stop();
  if (segAnimW) segAnimW.stop();
  segAnimX = spring({
    from: curX, to: x, damping: 1, response: 0.28, restDelta: 0.1, restSpeed: 0.4,
    onUpdate: function (v) { pill.style.transform = "translate3d(" + v.toFixed(2) + "px,0,0)"; }
  });
  segAnimW = spring({
    from: curW, to: w, damping: 1, response: 0.28, restDelta: 0.1, restSpeed: 0.4,
    onUpdate: function (v) { pill.style.width = v.toFixed(2) + "px"; }
  });
}

function switchView(name, instant) {
  if (views.indexOf(name) === -1) name = "market";
  currentView = name;

  for (var i = 0; i < views.length; i++) {
    var v = views[i];
    var el = document.getElementById("view-" + v);
    var on = v === name;
    el.hidden = !on;
    el.classList.toggle("is-active", on);
  }

  var tabs = document.querySelectorAll(".tab");
  for (var k = 0; k < tabs.length; k++) {
    var tab = tabs[k];
    var active = tab.getAttribute("data-view") === name;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
    if (active) movePill(tab, instant);
  }

  renderView();
}

function renderView() {
  if (currentView === "market") renderMarket();
  if (currentView === "own") renderOwn();
  if (currentView === "mines") renderFleet();
  if (currentView === "shop") renderShop();
  if (currentView === "black") renderBlack();
  if (currentView === "profile") { renderProfile(); renderPrestige(); }
}

function applyTheme() {
  if (state.theme) document.documentElement.setAttribute("data-theme", state.theme);
  else document.documentElement.removeAttribute("data-theme");
  refreshPalette();
  renderView();
}

function renderStats() {
  setNumber(document.getElementById("statCash"), state.cash, fmtMoney);
  document.getElementById("statCash").title = fmtMoneyExact(state.cash);
  setNumber(document.getElementById("statRate"), totalRate(), function (v) { return fmtMoney(v) + "/s"; });
  setNumber(document.getElementById("statWorth"), netWorth(), fmtMoney);

  var combo = document.getElementById("comboPill");
  combo.hidden = state.combo === 0;
  if (state.combo > 0) {
    document.getElementById("comboVal").textContent = "+" + state.combo + "x";
  }
}

function renderAll() {
  renderStats();
  renderView();
  if (sheet.open) renderSheet();
}

function tick() {
  var now = performance.now();
  if (now - lastTick < 400) return;
  lastTick = now;
  tickCount += 1;

  tickMarket();
  maybeTriggerEvent();
  maybeTriggerChoice();

  var income = totalRate();
  if (income > 0) {
    state.cash += income;
    state.stats.earned += income;
  }
  if (tickCount % 8 === 0) state.day += 1;
  if (tickCount % 3 === 0) pushWorthLog();

  renderStats();
  renderEvent();
  renderChoice();

  switch (currentView) {
    case "own": renderOwn(); break;
    case "mines": renderFleet(); break;
    case "shop": renderShop(); break;
    case "black": renderBlack(); break;
    case "profile": renderProfile(); renderPrestige(); break;
  }
  if (sheet.open) renderSheet();

  var scale = Math.pow(10, state.legacy);
  for (var i = 0; i < MILESTONES.length; i++) {
    var m = MILESTONES[i] * scale;
    if (netWorth() >= m && state.milestones.indexOf(m) === -1) {
      state.milestones.push(m);
      news("Reached " + fmtMoney(m), "gain");
      calm(document.getElementById("statWorth"), "gain");
    }
  }
  saveGame();
}

function initApp() {
  var hadSave = loadGame();
  if (state.event && state.event.until <= Date.now()) state.event = null;
  if (state.choice && state.choice.until <= Date.now()) state.choice = null;
  if (state.nextEventAt === undefined) state.nextEventAt = Date.now() + 30000;
  if (state.nextChoiceAt === undefined) state.nextChoiceAt = Date.now() + 60000;

  buildMarket();
  buildFleet();
  buildShop();
  buildBlack();
  buildOneCoin();
  buildProfile();
  initSheet();

  var tabs = document.querySelectorAll(".tab");
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener("click", function () {
      switchView(this.getAttribute("data-view"));
    });
  }

  document.querySelectorAll("#moonChoice [data-act]").forEach(function (btn) {
    btn.addEventListener("click", function () { resolveChoice(btn.getAttribute("data-act")); });
  });

  document.getElementById("sellAllBtn").addEventListener("click", sellAllCoins);
  document.getElementById("oneCoinBtn").addEventListener("click", revealOneCoin);
  document.getElementById("prestigeBox").querySelector(".btn").addEventListener("click", doPrestige);

  document.addEventListener("keydown", function (e) {
    if (sheet.open) return;
    if (e.target.matches("input, textarea")) return;
    var i = "123456".indexOf(e.key);
    if (i !== -1) switchView(views[i]);
  });

  document.getElementById("themeBtn").addEventListener("click", function () {
    var prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    var now = state.theme || (prefersLight ? "light" : "dark");
    state.theme = now === "light" ? "dark" : "light";
    applyTheme();
    saveGame();
  });

  document.getElementById("resetBtn").addEventListener("click", function () {
    if (!window.confirm("Start from zero? Everything is lost.")) return;
    closeSheet();
    state.legacy = 0;
    resetState();
    news("Fresh start");
    renderAll();
    saveGame();
  });

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (sheet.open) {
        sheet.h = sheetHeight();
        sheet.y = 0;
        paintSheet();
        renderSheet();
      }
      movePill(document.querySelector(".tab.is-active"), true);
      renderView();
      renderStats();
    }, 140);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { saveGame(); return; }
    lastTick = 0;
    var gain = catchUpIncome();
    if (gain > 0) {
      news("Machines kept running · " + fmtMoney(gain), "gain");
      calm(document.getElementById("statCash"), "gain");
    }
    renderAll();
    saveGame();
  });

  var welcome = hadSave ? catchUpIncome() : 0;

  applyTheme();
  switchView("market", true);
  setInterval(tick, TICK_MS);

  if (welcome > 0) {
    setTimeout(function () {
      news("Machines kept running · " + fmtMoney(welcome), "gain");
      calm(document.getElementById("statCash"), "gain");
    }, 500);
  } else if (!hadSave) {
    setTimeout(function () { news("Buy a Pocket Rig to start earning"); }, 500);
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initApp);
else initApp();
