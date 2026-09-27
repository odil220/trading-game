function buildFleet() {
  var wrap = document.getElementById("fleetList");
  wrap.innerHTML = "";
  MACHINES.forEach(function (m) {
    var card = document.createElement("article");
    card.className = "card";
    card.hidden = true;
    card.innerHTML =
      '<div class="c-top"><b></b><span class="badge"></span></div>' +
      '<div class="c-rate"><b class="tabular"></b><i>/s</i></div>' +
      '<div class="c-foot"><button class="btn"></button></div>';
    card.querySelector("b").textContent = m.name;
    card.querySelector(".btn").addEventListener("click", function () { buyMachine(m.id); });
    wrap.appendChild(card);
    m.card = card;
    m.badgeEl = card.querySelector(".badge");
    m.rateEl = card.querySelector(".c-rate b");
    m.rateEl.id = "fleet-" + m.id;
    m.btnEl = card.querySelector(".btn");
  });
  renderFleet();
}

function renderFleet() {
  var any = false;
  for (var i = 0; i < MACHINES.length; i++) {
    var m = MACHINES[i];
    var level = machineLevel(m.id);
    if (level === 0) {
      if (!m.card.hidden) m.card.hidden = true;
      continue;
    }
    any = true;
    if (m.card.hidden) m.card.hidden = false;
    var cost = machineCost(m.id);
    m.badgeEl.textContent = "Lv " + level;
    setNumber(m.rateEl, machineRate(m.id), function (v) { return fmtMoney(v) + "/s"; });
    m.btnEl.textContent = "Upgrade · " + fmtMoney(cost);
    m.btnEl.disabled = state.cash < cost;
  }
  document.getElementById("fleetEmpty").hidden = any;
  var rate = document.getElementById("fleetRate");
  setNumber(rate, totalRate(), function (v) { return fmtMoney(v) + "/s"; });
  document.getElementById("fleetCount").textContent = String(machineCount());
}
