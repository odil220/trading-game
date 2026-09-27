function blackPrice(item) {
  var uses = state.blackUses[item.id] || 0;
  return Math.round(item.price * Math.pow(item.mult, uses) * Math.pow(10, state.legacy));
}

function blackAvailable(item) {
  if (item.id === "reroll") return !!activeEvent();
  if (item.id === "freeze") return true;
  return !buffActive(item.id);
}

function useBlack(item) {
  if (!blackAvailable(item)) return;
  var price = blackPrice(item);
  if (state.cash < price) { news("Not enough money"); return; }

  state.cash -= price;
  state.blackUses[item.id] = (state.blackUses[item.id] || 0) + 1;

  if (item.id === "overclock") {
    setBuff("overclock", 30000);
    news("2x money / second for 30s", "gain");
  } else if (item.id === "freeze") {
    var list = safeCoins();
    var target = list[Math.floor(Math.random() * list.length)].sym;
    setBuff("freeze", 20000, { sym: target });
    news(target + " frozen for 20s", "gain");
  } else if (item.id === "insurance") {
    setBuff("insurance", 3600000);
    news("Crash Cover ready", "gain");
  } else if (item.id === "reroll") {
    rerollEvent();
    news("Event rerolled", "gain");
  } else if (item.id === "mooncover") {
    setBuff("mooncover", 60000);
    news("MOON Cover for 60s", "gain");
  }

  renderAll();
  saveGame();
}

function buildBlack() {
  var wrap = document.getElementById("blackList");
  if (!wrap) return;
  wrap.innerHTML = "";
  BLACK_ITEMS.forEach(function (item) {
    var el = document.createElement("button");
    el.className = "item";
    el.innerHTML =
      '<span class="i-top"><b></b><i></i></span>' +
      '<span class="i-desc"></span>' +
      '<span class="i-foot"><span class="i-price"></span><span class="i-left"></span></span>';
    el.querySelector("b").textContent = item.name;
    el.querySelector("i").textContent = item.tag;
    el.querySelector(".i-desc").textContent = item.desc;
    el.addEventListener("click", function () { useBlack(item); });
    wrap.appendChild(el);
    item.el = el;
    item.priceEl = el.querySelector(".i-price");
    item.leftEl = el.querySelector(".i-left");
  });
  renderBlack();
}

function renderBlack() {
  BLACK_ITEMS.forEach(function (item) {
    if (!item.el) return;
    var price = blackPrice(item);
    var left = buffLeft(item.id === "insurance" ? "insurance" : item.id);
    if (item.id === "freeze") left = buffLeft("freeze");
    var ok = blackAvailable(item) && state.cash >= price;

    item.el.disabled = !ok;
    item.el.classList.toggle("is-on", left > 0);
    item.priceEl.textContent = left > 0
      ? (item.id === "insurance" ? "Ready" : "On · " + Math.ceil(left / 1000) + "s")
      : fmtMoney(price);
    item.leftEl.textContent = "Used " + (state.blackUses[item.id] || 0) + "x";
  });
}
