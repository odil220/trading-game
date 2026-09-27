function buildShop() {
  var wrap = document.getElementById("shopList");
  wrap.innerHTML = "";
  MACHINES.forEach(function (m) {
    var card = document.createElement("article");
    card.className = "card";
    card.innerHTML =
      '<div class="c-top"><b></b><span class="badge"></span></div>' +
      '<div class="c-rate"><b class="tabular"></b><i>/s</i></div>' +
      '<div class="c-sub"></div>' +
      '<div class="c-foot"><button class="btn"></button><span class="c-back"></span></div>';
    card.querySelector("b").textContent = m.name;
    card.querySelector(".badge").textContent = m.tag;
    card.querySelector(".c-sub").textContent = m.desc;
    card.querySelector(".btn").addEventListener("click", function () { buyMachine(m.id); });
    wrap.appendChild(card);
    m.shopCard = card;
    m.shopRate = card.querySelector(".c-rate b");
    m.shopRate.id = "shop-" + m.id;
    m.shopBtn = card.querySelector(".btn");
    m.shopBack = card.querySelector(".c-back");
  });
  renderShop();
}

function renderShop() {
  for (var i = 0; i < MACHINES.length; i++) {
    var m = MACHINES[i];
    var level = machineLevel(m.id);
    var cost = machineCost(m.id);
    var rate = level > 0 ? machineRate(m.id) : m.rate;
    setNumber(m.shopRate, rate, function (v) { return fmtMoney(v) + "/s"; });
    m.shopBtn.textContent = (level > 0 ? "Upgrade " + fmtMoney(cost) : "Buy " + fmtMoney(cost));
    m.shopBtn.disabled = state.cash < cost;
    m.shopBack.textContent = "back in " + payback(cost, rate);
  }
}

function payback(cost, rate) {
  if (rate <= 0) return "-";
  var s = cost / rate;
  if (s < 90) return Math.max(1, Math.round(s)) + "s";
  if (s < 5400) return Math.round(s / 60) + "m";
  if (s < 172800) return (s / 3600).toFixed(1) + "h";
  return (s / 86400).toFixed(1) + "d";
}
