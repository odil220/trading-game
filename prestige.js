function prestigeGoal() { return PRESTIGE_AT * Math.pow(10, state.legacy); }

function canPrestige() { return netWorth() >= prestigeGoal() && state.legacy < 20; }

function doPrestige() {
  if (!canPrestige()) return;
  if (!window.confirm("Start over stronger? You lose your money and machines. " +
    "Each start gives +25% money / second forever.")) return;

  var legacy = state.legacy + 1;
  state.legacy = legacy;
  resetState();
  state.nextEventAt = Date.now() + 25000;
  state.nextChoiceAt = Date.now() + 45000;
  news("Start " + legacy + " · +" + legacy * 25 + "% money / second", "gain");
  renderAll();
  saveGame();
}

function renderPrestige() {
  var box = document.getElementById("prestigeBox");
  if (!box) return;
  var goal = prestigeGoal();
  var ready = canPrestige();
  box.querySelector(".pg-text").textContent =
    "Start over at " + fmtMoney(goal) + ". You keep +" + state.legacy * 25 + "% money / second" +
    (state.legacy > 0 ? " and everything gets 10x harder." : ".");
  box.querySelector(".pg-prog").textContent = fmtMoney(netWorth()) + " / " + fmtMoney(goal);
  box.querySelector(".bar i").style.transform = "scaleX(" + clamp(netWorth() / goal, 0, 1).toFixed(3) + ")";
  var btn = box.querySelector(".btn");
  btn.textContent = ready ? "Start over" : "Locked";
  btn.disabled = !ready;
  btn.className = ready ? "btn accent" : "btn";
}
