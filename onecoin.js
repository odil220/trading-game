function machineCapital() {
  var sum = 0;
  MACHINES.forEach(function (m) { sum += state.machineInvested[m.id] || 0; });
  return sum;
}

function fmtUnits(n) {
  if (!isFinite(n)) return "∞";
  if (n >= 1000) return fmtCompact(n, 2);
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 0.0001) return n.toFixed(5);
  return n.toExponential(2);
}

var oneCoinSym = "MOON";
var oneCoinAnim = null;

function buildOneCoin() {
  var wrap = document.getElementById("oneCoinChips");
  if (!wrap) return;
  wrap.innerHTML = "";
  COINS.forEach(function (c) {
    var chip = document.createElement("button");
    chip.className = "chip" + (c.sym === oneCoinSym ? " is-on" : "");
    chip.setAttribute("aria-pressed", c.sym === oneCoinSym ? "true" : "false");
    chip.textContent = c.sym;
    chip.addEventListener("click", function () {
      oneCoinSym = c.sym;
      Array.prototype.forEach.call(wrap.children, function (el) {
        var on = el.textContent === c.sym;
        el.classList.toggle("is-on", on);
        el.setAttribute("aria-pressed", on ? "true" : "false");
      });
      renderOneCoin();
    });
    wrap.appendChild(chip);
  });
  renderOneCoin();
}

function revealOneCoin() {
  var card = document.getElementById("oneCoin");
  if (!card) return;
  var showing = !card.hidden;
  if (showing) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  renderOneCoin();
  if (reduced) return;
  if (oneCoinAnim) oneCoinAnim.stop();
  oneCoinAnim = spring({
    from: 0, to: 1, damping: 1, response: 0.3,
    onUpdate: function (x) {
      card.style.opacity = x.toFixed(3);
      card.style.transform = "translate3d(0," + ((1 - x) * 10).toFixed(2) + "px,0) scale(" + (0.97 + x * 0.03).toFixed(4) + ")";
    },
    onComplete: function () {
      card.style.opacity = "";
      card.style.transform = "";
    }
  });
}

function renderOneCoin() {
  var card = document.getElementById("oneCoin");
  if (!card) return;

  var coin = coinBySym(oneCoinSym);
  var price = coin.price;
  var holdings = 0;
  COINS.forEach(function (c) { holdings += sharesOf(c.sym) * c.price; });
  var machines = machineCapital();
  var everything = state.cash + holdings + machines;

  var units = price > 0 ? everything / price : 0;
  var ownUnits = sharesOf(oneCoinSym);

  setNumber(card.querySelector(".oc-big"), units, fmtUnits);
  card.querySelector(".oc-sym").textContent = oneCoinSym;
  card.querySelector(".oc-big").title = Math.round(units).toLocaleString("en-US") + " " + oneCoinSym;
  card.querySelector(".oc-sub").textContent =
    "at " + fmtMoney(price) + " each · worth " + fmtMoney(everything) + " in total";

  var rows = [
    { k: "Idle cash", v: fmtMoney(state.cash), u: fmtUnits(state.cash / price) },
    { k: "Coin holdings", v: fmtMoney(holdings), u: fmtUnits(holdings / price) },
    { k: "Machines", v: fmtMoney(machines), u: fmtUnits(machines / price) },
    { k: "You already hold", v: fmtInt(ownUnits) + " " + oneCoinSym, u: ownUnits >= 0 ? fmtMoney(ownUnits * price) : "—" },
    { k: "Income per second", v: fmtMoney(totalRate()) + "/s", u: fmtUnits(totalRate() / price) + "/s" }
  ];

  var wrap = card.querySelector(".oc-rows");
  if (wrap.childElementCount !== rows.length) {
    wrap.innerHTML = "";
    rows.forEach(function (r) {
      var el = document.createElement("div");
      el.innerHTML = "<span></span><b class='tabular'></b><i class='tabular'></i>";
      el.querySelector("span").textContent = r.k;
      wrap.appendChild(el);
    });
  }
  for (var r = 0; r < rows.length; r++) {
    var row = wrap.children[r];
    row.querySelector("b").textContent = rows[r].v;
    row.querySelector("i").textContent = rows[r].u;
  }

  var open = openOf(oneCoinSym);
  var moved = open > 0 ? ((coin.price - open) / open) * 100 : 0;
  var risk = card.querySelector(".oc-risk");
  risk.hidden = !coin.wild;
  risk.textContent = coin.wild
    ? (Math.abs(moved) < 0.5
      ? oneCoinSym + " is a wild card. This number moves with it."
      : oneCoinSym + " is " + fmtPct(moved) + " since you opened this page, so this number moves with it.")
    : "";
}
