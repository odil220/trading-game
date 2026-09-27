function sellAllCoins() {
  var qty = 0, value = 0, basis = 0;
  COINS.forEach(function (c) {
    var shares = sharesOf(c.sym);
    if (shares <= 0) return;
    qty += shares;
    value += shares * c.price;
    basis += state.basis[c.sym] || 0;
  });
  if (qty <= 0) { news("Nothing to sell"); return; }
  if (!window.confirm("Sell everything for " + fmtMoney(value) + "?")) return;

  COINS.forEach(function (c) {
    state.shares[c.sym] = 0;
    state.basis[c.sym] = 0;
  });
  var profit = value - basis;
  state.cash += value;
  state.stats.realized += profit;
  state.tradeCount = (state.tradeCount || 0) + 1;
  if (profit > 0) bumpCombo(true); else if (profit < 0) bumpCombo(false);
  if (profit > (state.bestWin || 0)) state.bestWin = profit;
  news("Sold everything · " + (profit >= 0 ? "+" : "") + fmtMoney(profit), profit >= 0 ? "gain" : "loss");
  calm(document.getElementById("statCash"), profit >= 0 ? "gain" : "loss");
  renderAll();
  saveGame();
}

function coinPosition(c) {
  var shares = sharesOf(c.sym);
  var basis = state.basis[c.sym] || 0;
  var value = shares * c.price;
  return {
    sym: c.sym,
    shares: shares,
    basis: basis,
    value: value,
    avg: shares > 0 ? basis / shares : 0,
    pnl: value - basis,
    pct: basis > 0 ? ((value - basis) / basis) * 100 : 0
  };
}

function machinePosition(m) {
  var invested = state.machineInvested[m.id] || 0;
  var rate = machineRate(m.id);
  return {
    id: m.id,
    name: m.name,
    level: machineLevel(m.id),
    invested: invested,
    rate: rate,
    payback: rate > 0 ? invested / rate : Infinity
  };
}

function portfolioTotals() {
  var invested = 0, value = 0, pnl = 0, coinValue = 0, machineValue = 0;
  COINS.forEach(function (c) {
    var p = coinPosition(c);
    invested += p.basis;
    value += p.value;
    coinValue += p.value;
    pnl += p.pnl;
  });
  MACHINES.forEach(function (m) {
    var p = machinePosition(m);
    invested += p.invested;
    value += p.invested;
    machineValue += p.invested;
  });
  return {
    invested: invested, value: value, pnl: pnl,
    coinValue: coinValue, machineValue: machineValue,
    cash: state.cash, income: totalRate()
  };
}

function nextBestBuy() {
  var best = null;
  MACHINES.forEach(function (m) {
    var cost = machineCost(m.id);
    if (state.cash < cost) return;
    var rate = machineLevel(m.id) > 0 ? machineRate(m.id) : m.rate;
    var perDollar = rate / cost;
    if (!best || perDollar > best.perDollar) best = { m: m, cost: cost, rate: rate, perDollar: perDollar };
  });
  return best;
}

function renderOwn() {
  var t = portfolioTotals();
  var wrap = document.getElementById("ownStats");
  if (!wrap) return;

  var tiles = [
    { label: "Put in", value: fmtMoney(t.invested) },
    { label: "Worth now", value: fmtMoney(t.value) },
    { label: "Profit", value: (t.pnl >= 0 ? "+" : "") + fmtMoney(t.pnl), tone: t.pnl >= 0 ? "up" : "down" },
    { label: "Money / Second", value: fmtMoney(t.income) + "/s" }
  ];
  if (wrap.childElementCount !== tiles.length) {
    wrap.innerHTML = "";
    tiles.forEach(function () {
      var el = document.createElement("div");
      el.className = "tile";
      el.innerHTML = "<span></span><b class='tabular'></b>";
      wrap.appendChild(el);
    });
  }
  for (var i = 0; i < tiles.length; i++) {
    wrap.children[i].querySelector("span").textContent = tiles[i].label;
    var b = wrap.children[i].querySelector("b");
    b.textContent = tiles[i].value;
    b.className = "tabular" + (tiles[i].tone ? " " + tiles[i].tone : "");
  }

  var total = t.coinValue + t.machineValue + t.cash;
  var cShare = total > 0 ? (t.coinValue / total) * 100 : 0;
  var mShare = total > 0 ? (t.machineValue / total) * 100 : 0;
  var alloc = document.getElementById("ownAlloc");
  alloc.querySelector(".seg-coin").style.width = cShare.toFixed(2) + "%";
  alloc.querySelector(".seg-machine").style.width = mShare.toFixed(2) + "%";
  alloc.querySelector(".seg-cash").style.width = (100 - cShare - mShare).toFixed(2) + "%";
  document.getElementById("ownNote").textContent =
    fmtMoney(t.coinValue) + " coins · " + fmtMoney(t.machineValue) + " machines · " + fmtMoney(t.cash) + " spare";

  var next = nextBestBuy();
  document.getElementById("ownBuy").textContent = next
    ? "Next buy · " + next.m.name + " · " + fmtMoney(next.cost) + " → " + fmtMoney(next.rate) + "/s"
    : "Not enough for a machine yet";

  var coinList = document.getElementById("ownCoins");
  var positions = COINS.map(coinPosition).filter(function (p) { return p.shares > 0; });
  fillRows(coinList, positions, function (p) {
    return {
      name: p.sym,
      main: fmtMoney(p.value),
      sub: fmtInt(p.shares) + " bought at " + fmtMoney(p.avg) + " · put in " + fmtMoney(p.basis),
      tone: p.pnl >= 0 ? "up" : "down",
      right: (p.pnl >= 0 ? "+" : "") + fmtMoney(p.pnl) + (p.basis > 0 ? " · " + fmtPct(p.pct) : "")
    };
  }, "No coins yet. Buy one in Market.");

  var machines = MACHINES.map(machinePosition).filter(function (p) { return p.level > 0; });
  fillRows(document.getElementById("ownMachines"), machines, function (p) {
    return {
      name: p.name,
      main: fmtMoney(p.rate) + "/s",
      sub: "Lv " + p.level + " · put in " + fmtMoney(p.invested) + " · pays back in " + payback(p.invested, p.rate),
      right: fmtPct((p.rate / Math.max(totalRate(), 1e-9)) * 100).replace("+", "") + " of income"
    };
  }, "No machines yet. Buy one in the Shop.");

  var card = document.getElementById("oneCoin");
  if (card && !card.hidden) renderOneCoin();
}

function fillRows(host, items, map, emptyText) {
  if (!items.length) {
    if (host.dataset.empty !== "1") {
      host.innerHTML = '<p class="empty-line"></p>';
      host.dataset.empty = "1";
    }
    host.firstChild.textContent = emptyText;
    return;
  }
  if (host.dataset.empty === "1") {
    host.innerHTML = "";
    host.dataset.empty = "0";
  }
  while (host.childElementCount < items.length) {
    var el = document.createElement("div");
    el.className = "row";
    el.innerHTML = "<div class='r-id'><b></b><span class='r-sub'></span></div><div class='r-right'><b class='tabular'></b><i class='tabular'></i></div>";
    host.appendChild(el);
  }
  while (host.childElementCount > items.length) host.removeChild(host.lastChild);

  for (var i = 0; i < items.length; i++) {
    var d = map(items[i]);
    var row = host.children[i];
    row.querySelector("b").textContent = d.name;
    row.querySelector(".r-sub").textContent = d.sub;
    var right = row.querySelector(".r-right b");
    right.textContent = d.main;
    right.className = "tabular";
    var extra = row.querySelector(".r-right i");
    extra.textContent = d.right;
    extra.className = "tabular " + (d.tone || "");
  }
}
