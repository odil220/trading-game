var SUFFIX = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qt"];

function clamp(n, lo, hi) { return n < lo ? lo : n > hi ? hi : n; }

function tierOf(n) {
  if (!isFinite(n) || n <= 0) return 0;
  var log10 = Math.log10 ? Math.log10(n) : Math.log(n) / Math.LN10;
  return clamp(Math.floor(log10 / 3 + 1e-9), 0, SUFFIX.length - 1);
}

function fmtCompact(n) {
  if (!isFinite(n)) return "0";
  var neg = n < 0;
  var abs = Math.abs(n);
  var out;
  if (abs < 1000) {
    out = abs < 1 && abs > 0 ? abs.toFixed(2) : abs < 100 ? abs.toFixed(abs % 1 ? 1 : 0) : Math.floor(abs).toString();
  } else {
    var tier = tierOf(abs);
    var v = abs / Math.pow(1000, tier);
    out = v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + SUFFIX[tier];
  }
  return (neg ? "-" : "") + out;
}

function fmtMoney(n) { return (n < 0 ? "-$" : "$") + fmtCompact(n); }

function fmtPrice(n) {
  var abs = Math.abs(n);
  if (abs >= 1000) return fmtMoney(n);
  return (n < 0 ? "-$" : "$") + abs.toFixed(2);
}

function fmtPct(p) {
  if (!isFinite(p)) return "0%";
  if (p <= -99.95) p = -99.9;
  if (p > 9999) p = 9999;
  return (p >= 0 ? "+" : "") + fmtCompact(p) + "%";
}

function fmtInt(n) {
  var abs = Math.abs(n);
  if (abs < 1e6) return Math.floor(n).toLocaleString("en-US");
  return fmtCompact(n);
}

function fmtMoneyExact(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

function news(msg, tone) {
  var el = document.getElementById("toast");
  if (!el) return;
  var lift = 0;
  if (typeof sheet !== "undefined" && sheet.open) lift = Math.min(sheet.h || 0, window.innerHeight * 0.55) + 10;
  document.documentElement.style.setProperty("--toast-lift", lift + "px");
  el.textContent = msg;
  el.className = "toast on" + (tone ? " " + tone : "");
  clearTimeout(news.timer);
  news.timer = setTimeout(function () { el.className = "toast"; }, 2800);
}

function calm(el, tone) {
  if (!el) return;
  el.classList.remove("rise", "fall");
  void el.offsetWidth;
  el.classList.add(tone === "gain" ? "rise" : "fall");
  clearTimeout(el._calm);
  el._calm = setTimeout(function () { el.classList.remove("rise", "fall"); }, 700);
}

var countAnims = {};

var nodeKey = 0;

function setNumber(el, value, formatter) {
  if (!el) return;
  if (!el.id) el.id = "num-" + (++nodeKey);
  var prev = countAnims[el.id] === undefined ? value : countAnims[el.id];
  countAnims[el.id] = value;
  if (reduced || Math.abs(value - prev) < 0.01 || value <= 0 || prev <= 0) {
    el.textContent = formatter(value);
    return;
  }
  var start = performance.now();
  var from = prev;
  var span = 260;
  if (countAnims[el._raf]) cancelAnimationFrame(countAnims[el._raf]);
  function frame(now) {
    var t = clamp((now - start) / span, 0, 1);
    var eased = 1 - Math.pow(1 - t, 3);
    el.textContent = formatter(from + (value - from) * eased);
    if (t < 1) countAnims[el._raf] = requestAnimationFrame(frame);
    else countAnims[el._raf] = 0;
  }
  countAnims[el._raf] = requestAnimationFrame(frame);
}

var palette = { up: "#32d74b", down: "#ff453a" };

function refreshPalette() {
  var cs = getComputedStyle(document.documentElement);
  palette = {
    up: cs.getPropertyValue("--up").trim(),
    down: cs.getPropertyValue("--down").trim()
  };
}
