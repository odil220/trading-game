var sheet = { el: null, scrim: null, y: 0, h: 0, open: false, anim: null };
var active = null;

function initSheet() {
  sheet.el = document.getElementById("sheet");
  sheet.scrim = document.getElementById("scrim");

  document.getElementById("sheetClose").addEventListener("click", closeSheet);
  sheet.scrim.addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sheet.open) closeSheet();
  });
  sheet.el.addEventListener("pointerdown", onGrabDown);

  var qty = document.getElementById("qtyInput");
  qty.addEventListener("input", function () {
    var v = parseInt(qty.value.replace(/\D/g, ""), 10);
    qty.value = isNaN(v) ? "" : String(v);
    renderSheet();
  });

  sheet.el.querySelectorAll("[data-step]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var step = parseInt(btn.getAttribute("data-step"), 10);
      var cur = parseInt(qty.value, 10);
      if (isNaN(cur)) cur = 0;
      qty.value = String(Math.max(0, cur + step));
      renderSheet();
    });
  });

  sheet.el.querySelectorAll("[data-qty]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!active) return;
      var maxBuy = Math.floor(state.cash / active.price);
      var mode = btn.getAttribute("data-qty");
      document.getElementById("qtyInput").value = String(mode === "max" ? maxBuy : Math.floor(maxBuy / 2));
      renderSheet();
    });
  });

  document.getElementById("buyBtn").addEventListener("click", function () { trade(1); });
  document.getElementById("sellBtn").addEventListener("click", function () { trade(-1); });

  sheet.el.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    if (e.target.id === "qtyInput") return;
    e.preventDefault();
    trade(document.activeElement === document.getElementById("sellBtn") ? -1 : 1);
  });
}

function sheetHeight() { return sheet.el.offsetHeight || 400; }

function paintSheet() {
  var h = sheet.h || sheetHeight();
  var p = h > 0 ? clamp(1 - sheet.y / h, 0, 1) : 0;
  sheet.el.style.transform = "translate3d(-50%," + sheet.y.toFixed(2) + "px,0)";
  sheet.scrim.style.opacity = p.toFixed(3);
}

function openTrade(sym) {
  active = coinBySym(sym);
  sheet.open = true;
  if (sheet.anim) sheet.anim.stop();

  document.getElementById("qtyInput").value = "1";
  document.getElementById("sheetName").textContent = active.name;

  sheet.el.classList.add("on");
  sheet.el.setAttribute("aria-hidden", "false");
  sheet.scrim.classList.add("on");
  sheet.h = sheetHeight();
  renderSheet();
  if (!reduced) setTimeout(function () { document.getElementById("sheetClose").focus(); }, 320);

  if (reduced) {
    sheet.y = 0;
    paintSheet();
    return;
  }
  sheet.y = sheet.h;
  paintSheet();
  sheet.anim = spring({
    from: sheet.y, to: 0, damping: 1, response: 0.32,
    onUpdate: function (x) { sheet.y = x; paintSheet(); }
  });
}

function closeSheet() {
  if (!sheet.open) return;
  sheet.open = false;
  document.getElementById("sheet").setAttribute("aria-hidden", "true");
  sheet.scrim.classList.remove("on");
  if (sheet.anim) sheet.anim.stop();

  if (reduced) {
    sheet.y = sheet.h;
    paintSheet();
    sheet.el.classList.remove("on");
    active = null;
    return;
  }
  sheet.anim = spring({
    from: sheet.y, to: sheet.h, damping: 1, response: 0.3,
    onUpdate: function (x) { sheet.y = x; paintSheet(); },
    onComplete: function () { sheet.el.classList.remove("on"); active = null; }
  });
}

function onGrabDown(e) {
  if (!sheet.open) return;
  if (e.target.closest("button, input")) return;

  var h = sheet.h || sheetHeight();
  var startY = e.clientY;
  var startSheet = sheet.y;
  var samples = [{ t: performance.now(), y: startSheet }];

  if (sheet.anim) sheet.anim.stop();
  sheet.el.setPointerCapture(e.pointerId);

  function move(ev) {
    var next = startSheet + (ev.clientY - startY);
    if (next < 0) next = rubberband(next, h);
    sheet.y = next;
    paintSheet();
    var now = performance.now();
    samples.push({ t: now, y: next });
    while (samples.length > 2 && now - samples[0].t > 110) samples.shift();
  }

  function up() {
    sheet.el.releasePointerCapture(e.pointerId);
    sheet.el.removeEventListener("pointermove", move);
    sheet.el.removeEventListener("pointerup", up);
    sheet.el.removeEventListener("pointercancel", up);

    var a = samples[0];
    var b = samples[samples.length - 1];
    var dt = (b.t - a.t) / 1000;
    var v = dt > 0.005 ? (b.y - a.y) / dt : 0;

    if (reduced) {
      if (sheet.y > h * 0.35) closeSheet();
      else { sheet.y = 0; paintSheet(); }
      return;
    }

    if (v > 420 || (Math.abs(v) <= 420 && sheet.y + project(v) > h * 0.42)) {
      sheet.open = false;
      sheet.el.setAttribute("aria-hidden", "true");
      sheet.scrim.classList.remove("on");
      sheet.anim = spring({
        from: sheet.y, to: h, damping: 1, response: 0.3, velocity: Math.max(v, 0),
        onUpdate: function (x) { sheet.y = x; paintSheet(); },
        onComplete: function () { sheet.el.classList.remove("on"); active = null; }
      });
    } else {
      sheet.anim = spring({
        from: sheet.y, to: 0, damping: 1, response: 0.32, velocity: Math.min(v, 0),
        onUpdate: function (x) { sheet.y = x; paintSheet(); }
      });
    }
  }

  sheet.el.addEventListener("pointermove", move);
  sheet.el.addEventListener("pointerup", up);
  sheet.el.addEventListener("pointercancel", up);
}

function renderSheet() {
  if (!active) return;
  var pct = ((active.price - openOf(active.sym)) / openOf(active.sym)) * 100;
  var up = pct >= 0;

  setNumber(document.getElementById("sheetPrice"), active.price, fmtPrice);

  var chg = document.getElementById("sheetChg");
  chg.textContent = active.wild ? active.state : fmtPct(pct);
  var chgTone = active.wild
    ? (active.state === "CRASH" ? "down" : active.state === "NORMAL" ? "" : "up")
    : (up ? "up" : "down");
  chg.className = "chg" + (chgTone ? " " + chgTone : "");

  var speed = document.getElementById("sheetSpeed");
  speed.textContent = "Price Speed: " + priceSpeed(active);

  drawSeries(document.getElementById("sheetChart"), priceLog[active.sym], up ? palette.up : palette.down, true);

  var qty = Math.max(0, parseInt(document.getElementById("qtyInput").value, 10) || 0);
  var held = sharesOf(active.sym);
  document.getElementById("posShares").textContent = fmtInt(held);
  document.getElementById("posValue").textContent = fmtMoney(held * active.price);
  document.getElementById("orderTotal").textContent = fmtMoney(qty * active.price);
  document.getElementById("buyBtn").disabled = qty === 0 || state.cash < qty * active.price;
  document.getElementById("sellBtn").disabled = qty === 0 || held < qty;
}

function trade(side) {
  if (!active) return;
  var qty = Math.max(0, parseInt(document.getElementById("qtyInput").value, 10) || 0);
  if (qty === 0) { news("Enter how many"); return; }

  var cost = qty * active.price;
  var held = sharesOf(active.sym);

  if (side > 0) {
    if (state.cash < cost) { news("Not enough money"); return; }
    state.tradeCount = (state.tradeCount || 0) + 1;
    state.cash -= cost;
    state.shares[active.sym] = held + qty;
    state.basis[active.sym] = (state.basis[active.sym] || 0) + cost;
    if (active.wild) state.flags.usedMoon = true;
    news("Bought " + fmtInt(qty) + " " + active.sym + " · " + fmtMoney(cost));
    calm(document.getElementById("statCash"), "loss");
  } else {
    if (held < qty) { news("You only have " + fmtInt(held)); return; }
    state.tradeCount = (state.tradeCount || 0) + 1;
    state.cash += cost;
    state.shares[active.sym] = held - qty;

    var basisBefore = state.basis[active.sym] || 0;
    var spent = held > 0 ? (basisBefore / held) * qty : 0;
    state.basis[active.sym] = Math.max(0, basisBefore - spent);

    var profit = cost - spent;
    state.stats.realized += profit;
    if (profit > (state.bestWin || 0)) state.bestWin = profit;
    if (profit > 0) {
      bumpCombo(true);
      news("Sold " + fmtInt(qty) + " " + active.sym + " · " + (profit >= 0 ? "+" : "") + fmtMoney(profit), profit >= 0 ? "gain" : "loss");
    } else {
      bumpCombo(false);
      news("Sold " + fmtInt(qty) + " " + active.sym + " · " + fmtMoney(profit), "loss");
    }
    calm(document.getElementById("statCash"), profit >= 0 ? "gain" : "loss");
  }
  renderAll();
  renderSheet();
  saveGame();
}
