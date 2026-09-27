function pickWeighted(list) {
  var total = 0;
  for (var i = 0; i < list.length; i++) total += list[i].weight;
  var r = Math.random() * total;
  for (var j = 0; j < list.length; j++) {
    r -= list[j].weight;
    if (r <= 0) return list[j];
  }
  return list[list.length - 1];
}

function startEvent(def) {
  state.event = {
    id: def.id, name: def.name, desc: def.desc,
    until: Date.now() + def.dur, total: def.dur, sym: null, ticks: 0
  };

  if (def.id === "whale") state.event.sym = safeCoins()[Math.floor(Math.random() * safeCoins().length)].sym;
  if (def.id === "viral") state.event.sym = COINS[Math.floor(Math.random() * COINS.length)].sym;

  if (def.id === "rug") {
    var risky = COINS.filter(function (c) { return c.risky; });
    var pick = risky[Math.floor(Math.random() * risky.length)];
    state.event.sym = pick.sym;
    pick.price = Math.max(pick.floor, pick.price * (1 - (0.65 + Math.random() * 0.25)));
    pick.state = "CRASH";
    if (sharesOf(pick.sym) > 0) bumpCombo(false);
  }

  if (def.id === "jackpot") {
    var prize = Math.max(totalRate() * 25, 3000 * Math.pow(1000, state.legacy));
    state.cash += prize;
    state.stats.earned += prize;
    state.stats.jackpots += 1;
    news("Free money · " + fmtMoney(prize), "gain");
    calm(document.getElementById("statCash"), "gain");
  } else {
    news(def.name + " · " + def.desc, def.id === "crash" || def.id === "rug" ? "loss" : "gain");
  }
  renderEvent();
}

function maybeTriggerEvent() {
  if (state.event && state.event.until > Date.now()) return;
  if (state.event) { state.event = null; renderEvent(); }
  if (state.nextEventAt === undefined) state.nextEventAt = Date.now() + 30000;
  if (Date.now() < state.nextEventAt) return;

  var def = pickWeighted(EVENTS);
  if (def.id === "crash" && buffActive("insurance")) {
    clearBuff("insurance");
    news("Crash Cover used · no crash", "gain");
    state.nextEventAt = Date.now() + 50000 + Math.random() * 50000;
    return;
  }
  startEvent(def);
  state.nextEventAt = Date.now() + 50000 + Math.random() * 50000;
}

function activeEvent() {
  if (state.event && state.event.until <= Date.now()) {
    state.event = null;
    renderEvent();
  }
  return state.event;
}

function eventAdjust(coin, pct) {
  var ev = activeEvent();
  if (!ev) return pct;
  if (coin.wild) {
    if (ev.id === "viral" && ev.sym === coin.sym) return pct + 10;
    return pct;
  }
  if (ev.id === "bull") return pct + 2.2;
  if (ev.id === "crash") return pct - 2.4;
  if (ev.id === "whale" && ev.sym === coin.sym) {
    ev.ticks += 1;
    return pct + (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 5);
  }
  if (ev.id === "viral" && ev.sym === coin.sym) {
    ev.ticks += 1;
    return pct + 5;
  }
  if (ev.id === "rug" && ev.sym === coin.sym) return pct - 2;
  return pct;
}

function renderEvent() {
  var box = document.getElementById("eventBar");
  if (!box) return;
  var ev = activeEvent();
  if (!ev) { box.hidden = true; return; }
  box.hidden = false;
  box.dataset.kind = ev.id;
  box.querySelector(".ev-name").textContent = ev.name;
  box.querySelector(".ev-desc").textContent = (ev.sym ? ev.sym + " · " : "") + ev.desc;
  var left = clamp(1 - (ev.until - Date.now()) / (ev.total || 30000), 0, 1);
  box.querySelector(".ev-bar i").style.transform = "scaleX(" + left.toFixed(3) + ")";
}

/* ---------- MOON decisions ---------- */

function maybeTriggerChoice() {
  if (state.choice) return;
  if (state.nextChoiceAt === undefined) state.nextChoiceAt = Date.now() + 80000;
  if (Date.now() < state.nextChoiceAt) return;
  state.nextChoiceAt = Date.now() + 70000 + Math.random() * 70000;

  var moon = coinBySym("MOON");
  if (sharesOf("MOON") === 0 && Math.random() < 0.5) return;

  state.choice = {
    until: Date.now() + 18000,
    sell: Math.floor(sharesOf("MOON") * moon.price * 1.05),
    stake: Math.max(1, Math.floor(state.cash * 0.2)),
    mult: 3 + Math.floor(Math.random() * 12),
    risk: 0.22 + Math.random() * 0.13
  };
  news("MOON is unstable · choose", "gain");
  renderChoice();
}

function renderChoice() {
  var box = document.getElementById("moonChoice");
  if (!box) return;
  if (!state.choice) { box.hidden = true; return; }

  var c = state.choice;
  var left = state.choice.until - Date.now();
  if (left <= 0) { resolveChoice("hold", true); return; }

  var moon = coinBySym("MOON");
  box.hidden = false;
  box.querySelector(".ch-head").textContent = "MOON · " + Math.ceil(left / 1000) + "s to choose";
  box.querySelector(".ch-text").textContent =
    "You have " + fmtMoney(sharesOf("MOON") * moon.price) + " of MOON and " + fmtMoney(state.cash) + " cash.";

  var sell = box.querySelector('[data-act="sell"]');
  sell.textContent = "Sell · " + fmtMoney(c.sell);
  sell.disabled = c.sell <= 0;
  box.querySelector('[data-act="hold"]').textContent =
    "Hold · " + Math.round(c.risk * 100) + "% x" + c.mult;
  box.querySelector('[data-act="double"]').textContent = "Bet 20% · x5";
  box.querySelector(".ch-bar i").style.transform = "scaleX(" + (left / 18000).toFixed(3) + ")";
}

function resolveChoice(act, auto) {
  var c = state.choice;
  if (!c) return;
  state.choice = null;
  renderChoice();

  var moon = coinBySym("MOON");

  if (act === "sell" && c.sell > 0) {
    var mBasis = state.basis.MOON || 0;
    state.shares.MOON = 0;
    state.basis.MOON = 0;
    state.cash += c.sell;
    var mProfit = c.sell - mBasis;
    state.stats.realized += mProfit;
    state.tradeCount = (state.tradeCount || 0) + 1;
    if (mProfit > 0) bumpCombo(true); else bumpCombo(false);
    if (mProfit > (state.bestWin || 0)) state.bestWin = mProfit;
    news("Sold MOON · " + (mProfit >= 0 ? "+" : "") + fmtMoney(mProfit), mProfit >= 0 ? "gain" : "loss");
    calm(document.getElementById("statCash"), mProfit >= 0 ? "gain" : "loss");
  } else if (act === "hold") {
    state.stats.moonEvents += 1;
    if (Math.random() < c.risk) {
      moon.price = Math.max(moon.floor, moon.price * c.mult);
      moon.state = "CRAZY JUMP";
      news("MOON x" + c.mult + " · you held", "gain");
    } else {
      moon.price = Math.max(moon.floor, moon.price * 0.55);
      moon.state = "CRASH";
      bumpCombo(false);
      news("MOON fell 45% · you held", "loss");
    }
  } else {
    var stake = Math.min(state.cash, c.stake);
    if (stake <= 0) return;
    state.stats.moonEvents += 1;
    if (Math.random() < 0.3) {
      state.cash += stake * 5;
      state.stats.earned += stake * 5;
      news("MOON x5 · +" + fmtMoney(stake * 5), "gain");
    } else {
      state.cash -= stake;
      moon.state = "CRASH";
      bumpCombo(false);
      news("Lost " + fmtMoney(stake), "loss");
    }
  }
  if (auto) news("Time ran out · you held MOON", "loss");
  renderAll();
  saveGame();
}

function rerollEvent() {
  if (state.event) { state.event = null; renderEvent(); }
  startEvent(pickWeighted(EVENTS));
  state.nextEventAt = Date.now() + 50000 + Math.random() * 50000;
}
