function machineCapital() {
  var sum = 0;
  MACHINES.forEach(function (m) { sum += state.machineInvested[m.id] || 0; });
  return sum;
}

function seedWorthLog() {
  if (!state.worthLog || !state.worthLog.length) {
    state.worthLog = [state.cash];
    state.peakWorth = Math.max(state.peakWorth || 0, state.cash);
  }
}

function pushWorthLog() {
  seedWorthLog();
  state.worthLog.push(netWorth());
  if (state.worthLog.length > 240) state.worthLog.shift();
  if (netWorth() > (state.peakWorth || 0)) state.peakWorth = netWorth();
}

function profileStats() {
  return [
    { label: "Total Money", value: fmtMoney(netWorth()) },
    { label: "Money / Second", value: fmtMoney(totalRate()) + "/s" },
    { label: "All-time earned", value: fmtMoney(state.stats.earned || 0) },
    { label: "Sold for", value: (state.stats.realized >= 0 ? "+" : "") + fmtMoney(state.stats.realized || 0) },
    { label: "Best sell", value: "+" + fmtMoney(state.bestWin || 0) },
    { label: "Buys & sells", value: fmtInt(state.tradeCount || 0) },
    { label: "Best combo", value: "+" + (state.bestCombo || 0) + "x" },
    { label: "Machines", value: fmtInt(machineCount()) },
    { label: "Days", value: String(state.day) },
    { label: "Free money drops", value: fmtInt(state.stats.jackpots || 0) },
    { label: "MOON gambles", value: fmtInt(state.stats.moonEvents || 0) },
    { label: "Start", value: fmtMoney(state.legacy > 0 ? START_CASH * (1 + state.legacy) : START_CASH) }
  ];
}

function renderProfile() {
  seedWorthLog();
  var log = state.worthLog;
  var worth = netWorth();
  var start = log[0] || START_CASH;
  var peak = state.peakWorth || worth;

  var nowEl = document.getElementById("pfNow");
  setNumber(nowEl, worth, fmtMoney);
  nowEl.title = fmtMoneyExact(worth);

  var gain = worth - start;
  var delta = document.getElementById("pfDelta");
  delta.textContent = (gain >= 0 ? "+" : "") + fmtMoney(gain) + (start > 0 ? " · " + fmtPct((gain / start) * 100) : "");
  delta.className = "pf-delta " + (gain >= 0 ? "up" : "down");

  document.getElementById("pfStart").textContent =
    "Start " + fmtMoney(start) + (state.legacy > 0 ? " · run " + (state.legacy + 1) : " · run 1");
  document.getElementById("pfDay").textContent = "Day " + state.day;
  document.getElementById("pfHint").textContent = "Best ever " + fmtMoney(peak);

  drawSeries(document.getElementById("pfChart"), log, gain >= 0 ? palette.up : palette.down, true);

  var wrap = document.getElementById("pfStats");
  if (wrap.childElementCount !== profileStats().length) {
    wrap.innerHTML = "";
    profileStats().forEach(function () {
      var el = document.createElement("div");
      el.className = "line";
      el.innerHTML = "<span></span><b class='tabular'></b>";
      wrap.appendChild(el);
    });
  }
  var data = profileStats();
  for (var i = 0; i < data.length; i++) {
    var row = wrap.children[i];
    row.querySelector("span").textContent = data[i].label;
    row.querySelector("b").textContent = data[i].value;
  }
}

function buildProfile() {
  seedWorthLog();
  renderProfile();
}
