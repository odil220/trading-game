function fitCanvas(cv) {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = cv.clientWidth;
  var h = cv.clientHeight;
  if (!w || !h) return null;
  var pw = Math.round(w * dpr);
  var ph = Math.round(h * dpr);
  if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
  var ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx: ctx, w: w, h: h };
}

function drawSeries(cv, data, color, big) {
  var f = fitCanvas(cv);
  if (!f || data.length < 2) return;
  var min = Infinity, max = -Infinity;
  for (var i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  if (!(max > 0)) max = 1;
  if (!(min > 0)) min = max / 1000;
  var logScale = max / min > 20;
  var tf = logScale ? Math.log : function (v) { return v; };
  var lo = tf(min), hi = tf(max);
  if (hi - lo < 0.0001) hi = lo + 1;

  var pad = big ? 6 : 2;
  var w = f.w, h = f.h;
  var stepX = w / (data.length - 1);
  var y = function (v) { return h - pad - ((tf(v) - lo) / (hi - lo)) * (h - pad * 2); };

  f.ctx.beginPath();
  f.ctx.moveTo(0, y(data[0]));
  for (var j = 1; j < data.length; j++) f.ctx.lineTo(j * stepX, y(data[j]));
  f.ctx.lineTo(w, h);
  f.ctx.lineTo(0, h);
  f.ctx.closePath();
  f.ctx.globalAlpha = big ? 0.14 : 0.1;
  f.ctx.fillStyle = color;
  f.ctx.fill();
  f.ctx.globalAlpha = 1;

  f.ctx.beginPath();
  f.ctx.moveTo(0, y(data[0]));
  for (var m = 1; m < data.length; m++) f.ctx.lineTo(m * stepX, y(data[m]));
  f.ctx.lineWidth = big ? 1.8 : 1.4;
  f.ctx.lineJoin = "round";
  f.ctx.lineCap = "round";
  f.ctx.strokeStyle = color;
  f.ctx.stroke();
}

var chartShown = {};
var chartDirty = {};
var chartRaf = 0;

function markDirty(sym) { chartDirty[sym] = true; }

function flashRow(c, dir) {
  if (!c.el || reduced || currentView !== "market") return;
  var cls = dir > 0 ? "tick-up" : "tick-down";
  c.el.classList.remove("tick-up", "tick-down");
  void c.el.offsetWidth;
  c.el.classList.add(cls);
  clearTimeout(c._flash);
  c._flash = setTimeout(function () { c.el.classList.remove(cls); }, 520);
}

function animateCharts() {
  var syms = Object.keys(chartDirty);
  if (!syms.length) return;
  if (chartRaf) { chartPending = true; return; }
  chartDirty = {};

  var jobs = [];
  syms.forEach(function (sym) {
    var target = priceLog[sym];
    if (!target || target.length < 2) return;
    var from = chartShown[sym] ? chartShown[sym].slice() : target.slice();
    while (from.length < target.length) from.unshift(target[0]);
    while (from.length > target.length) from.shift();
    jobs.push({ sym: sym, from: from, to: target.slice(), canvas: null });
  });
  if (!jobs.length) return;

  var start = performance.now();
  var dur = 320;
  chartPending = false;

  function frame(now) {
    var t = reduced ? 1 : clamp((now - start) / dur, 0, 1);
    var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    for (var i = 0; i < jobs.length; i++) {
      var job = jobs[i];
      var c = job.canvas || (job.canvas = chartCanvas[job.sym]);
      if (!c) continue;
      var out = new Array(job.to.length);
      for (var k = 0; k < job.to.length; k++) {
        out[k] = job.from[k] + (job.to[k] - job.from[k]) * eased;
      }
      chartShown[job.sym] = out;
      var up = job.to[job.to.length - 1] >= job.to[0];
      drawSeries(c, out, up ? palette.up : palette.down, c.dataset.big === "1");
    }
    if (t < 1) {
      chartRaf = requestAnimationFrame(frame);
    } else {
      chartRaf = 0;
      if (chartPending) { chartPending = false; animateCharts(); }
    }
  }
  chartRaf = requestAnimationFrame(frame);
}

var chartCanvas = {};
var chartPending = false;

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

function buildMarket() {
  var ul = document.getElementById("coinList");
  ul.innerHTML = "";
  COINS.forEach(function (c) {
    c.price = c.base;
    c.state = "NORMAL";
    priceLog[c.sym] = [c.base];
    chartShown[c.sym] = [c.base];
    chartCanvas[c.sym] = null;

    var li = document.createElement("li");
    li.className = "coin" + (c.wild ? " wild" : "");
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.setAttribute("aria-label", "Buy or sell " + c.name);
    li.innerHTML =
      '<div class="coin-id"><span class="sym"></span><span class="sub"></span></div>' +
      '<canvas aria-hidden="true"></canvas>' +
      '<div class="coin-num"><span class="price tabular"></span><span class="chg"></span></div>';
    li.querySelector(".sym").textContent = c.sym;
    li.querySelector(".sub").textContent = c.name;

    var canvas = li.querySelector("canvas");
    canvas.id = "spark-" + c.sym;
    chartCanvas[c.sym] = canvas;

    var priceEl = li.querySelector(".price");
    priceEl.id = "px-" + c.sym;

    li.addEventListener("click", function () { openTrade(c.sym); });
    li.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTrade(c.sym); }
    });

    ul.appendChild(li);
    c.el = li;
    c.priceEl = priceEl;
    c.subEl = li.querySelector(".sub");
    c.chgEl = li.querySelector(".chg");
    c.canvas = canvas;
  });
  refreshPalette();
  renderMarket(true);
}

function renderMarket(instant) {
  COINS.forEach(function (c) {
    if (!c.canvas) return;
    var pct = ((c.price - openOf(c.sym)) / openOf(c.sym)) * 100;
    var up = pct >= 0;

    setNumber(c.priceEl, c.price, fmtPrice);
    c.priceEl.title = fmtMoneyExact(c.price);
    c.chgEl.textContent = c.wild ? c.state : fmtPct(pct);
    var tone = up ? "up" : "down";
    if (c.wild) tone = c.state === "CRASH" ? "down" : c.state === "NORMAL" ? "" : "up";
    c.chgEl.className = "chg" + (tone ? " " + tone : "");

    if (c.wild) {
      c.subEl.textContent = c.state === "NORMAL" ? c.name : c.name + " · " + c.state;
      c.subEl.className = "sub" + (c.state === "NORMAL" ? "" : " " + (c.state === "CRASH" ? "warn" : "hot"));
    }

    if (instant) {
      chartShown[c.sym] = priceLog[c.sym].slice();
      drawSeries(c.canvas, chartShown[c.sym], up ? palette.up : palette.down, false);
    } else {
      markDirty(c.sym);
    }
  });
  if (!instant) animateCharts();
}

function tickMarket() {
  COINS.forEach(function (c) {
    var before = c.price;
    if (buffActive("freeze") && state.buffs.freeze.sym === c.sym) return;
    var next;

    if (c.wild) {
      var drift = gauss() * c.vol;
      if (Math.random() < 0.07) {
        var mult = Math.pow(10, 1 + Math.random() * 4);
        if (Math.random() < 0.5) mult = 1 / mult;
        next = c.price * mult;
        news(c.sym + " " + fmtPct((mult - 1) * 100), mult > 1 ? "gain" : "loss");
      } else {
        next = c.price * (1 + clamp(drift, -65, 65) / 100);
      }
      if (buffActive("mooncover")) next = Math.max(next, before * 0.5);
      next = clamp(next, c.floor, 1e9);
    } else {
      var pct = eventAdjust(c, c.drift + gauss() * c.vol);
      if (Math.random() < 0.04) {
        pct += (Math.random() < 0.5 ? -1 : 1) * c.vol * (3 + Math.random() * 4);
        news(c.sym + " " + (pct > 0 ? "jumps up" : "drops"), pct > 0 ? "gain" : "loss");
      }
      next = c.price * (1 + clamp(pct, -11, 11) / 100);
    }

    c.price = Math.max(c.floor, +next.toFixed(c.wild ? 8 : 2));
    if (c.price !== before) flashRow(c, c.price > before ? 1 : -1);
    c.state = moveState(((c.price - before) / before) * 100);
    priceLog[c.sym].push(c.price);
    if (priceLog[c.sym].length > HISTORY) priceLog[c.sym].shift();
  });
  renderMarket();
}
