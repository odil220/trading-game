var state = {
  cash: START_CASH,
  day: 1,
  shares: {},
  open: {},
  machines: {},
  basis: {},
  machineInvested: {},
  milestones: [],
  theme: null,
  combo: 0,
  bestCombo: 0,
  legacy: 0,
  worthLog: [],
  peakWorth: 0,
  tradeCount: 0,
  bestWin: 0,
  event: null,
  choice: null,
  buffs: {},
  blackUses: {},
  stats: { earned: 0, realized: 0, moonEvents: 0, jackpots: 0, peakSpent: 0 },
  flags: { usedMoon: false }
};

var priceLog = {};

function blankStats() {
  return { earned: 0, realized: 0, moonEvents: 0, jackpots: 0, peakSpent: 0 };
}

var OFFLINE_CAP = 2 * 3600 * 1000;
var OFFLINE_RATE = 0.6;

function saveGame() {
  state.savedAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
}

function timeAway() {
  return state.savedAt ? Math.max(0, Date.now() - state.savedAt) : 0;
}

function catchUpIncome() {
  var rate = totalRate();
  if (rate <= 0) return 0;
  var away = timeAway();
  if (away < 30000) return 0;
  var capped = Math.min(away, OFFLINE_CAP);
  var gain = rate * (capped / 1000) * OFFLINE_RATE;
  if (!(gain > 0)) return 0;
  state.cash += gain;
  state.stats.earned += gain;
  return gain;
}

function loadGame() {
  var raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  if (!raw) return false;
  try {
    var d = JSON.parse(raw);
    if (!d || typeof d.cash !== "number" || !isFinite(d.cash)) return false;
    if (!d.stats || typeof d.stats !== "object") d.stats = blankStats();
    var def = blankStats();
    for (var k in def) if (typeof d.stats[k] !== "number") d.stats[k] = 0;
    state.cash = d.cash;
    state.day = d.day || 1;
    state.shares = d.shares || {};
    state.open = d.open || {};
    state.machines = d.machines || {};
    state.basis = d.basis || {};
    state.machineInvested = d.machineInvested || {};
    state.milestones = d.milestones || [];
    state.theme = d.theme || null;
    state.combo = d.combo || 0;
    state.bestCombo = Math.max(state.combo, d.bestCombo || 0);
    state.legacy = d.legacy || 0;
    state.worthLog = Array.isArray(d.worthLog) ? d.worthLog : [];
    state.peakWorth = d.peakWorth || 0;
    state.tradeCount = d.tradeCount || 0;
    state.bestWin = d.bestWin || 0;
    state.event = d.event || null;
    state.choice = d.choice || null;
    state.buffs = d.buffs || {};
    state.blackUses = d.blackUses || {};
    state.stats = d.stats;
    state.savedAt = d.savedAt || 0;
    state.flags = d.flags || { usedMoon: false };
    return true;
  } catch (e) { return false; }
}

function resetState() {
  state.cash = START_CASH * (1 + state.legacy);
  state.day = 1;
  state.shares = {};
  state.open = {};
  state.machines = {};
  state.basis = {};
  state.machineInvested = {};
  state.milestones = [];
  state.combo = 0;
  state.tradeCount = 0;
  state.bestWin = 0;
  state.peakWorth = 0;
  state.worthLog = [state.cash];
  state.event = null;
  state.choice = null;
  state.buffs = {};
  state.stats = blankStats();
  state.flags = { usedMoon: false };
  COINS.forEach(function (c) {
    c.price = c.base;
    priceLog[c.sym] = [c.base];
  });
}

/* ---------- coins ---------- */

function coinBySym(sym) {
  for (var i = 0; i < COINS.length; i++) if (COINS[i].sym === sym) return COINS[i];
  return COINS[0];
}

function safeCoins() {
  return COINS.filter(function (c) { return !c.wild; });
}

function sharesOf(sym) { return state.shares[sym] || 0; }

function openOf(sym) {
  if (state.open[sym] === undefined) state.open[sym] = coinBySym(sym).price;
  return state.open[sym];
}

function priceSpeed(c) {
  if (c.wild) return "Crazy";
  if (c.vol >= 2.4) return "Fast";
  if (c.vol >= 1.6) return "Normal";
  return "Slow";
}

function moveState(pct) {
  if (pct >= 300) return "CRAZY JUMP";
  if (pct <= -60) return "CRASH";
  if (pct >= 15 || pct <= -15) return "BIG JUMP";
  return "NORMAL";
}

/* ---------- machines ---------- */

function machineById(id) {
  for (var i = 0; i < MACHINES.length; i++) if (MACHINES[i].id === id) return MACHINES[i];
  return null;
}

function machineLevel(id) { return state.machines[id] || 0; }

function machineRate(id) {
  var m = machineById(id);
  var level = machineLevel(id);
  return level > 0 ? m.rate * Math.pow(LEVEL_RATE_MULT, level - 1) : 0;
}

function machineCost(id) {
  var m = machineById(id);
  return Math.round(m.cost * Math.pow(LEVEL_COST_MULT, machineLevel(id)));
}

function miningMultiplier() {
  var m = 1 + state.legacy * 0.25;
  if (buffActive("overclock")) m *= 2;
  if (state.combo > 0) m *= 1 + state.combo * 0.2;
  return m;
}

function totalRate() {
  var sum = 0;
  for (var i = 0; i < MACHINES.length; i++) sum += machineRate(MACHINES[i].id);
  return sum * miningMultiplier();
}

function machineCount() {
  var n = 0;
  for (var i = 0; i < MACHINES.length; i++) n += machineLevel(MACHINES[i].id);
  return n;
}

function netWorth() {
  var sum = state.cash;
  for (var i = 0; i < COINS.length; i++) sum += sharesOf(COINS[i].sym) * COINS[i].price;
  return sum;
}

function buyMachine(id) {
  var m = machineById(id);
  if (!m) return;
  var cost = machineCost(id);
  if (state.cash < cost) { news("Not enough money"); return; }
  var first = machineLevel(id) === 0;
  state.cash -= cost;
  state.machines[id] = machineLevel(id) + 1;
  state.machineInvested[id] = (state.machineInvested[id] || 0) + cost;
  news(first ? m.name + " bought" : m.name + " → Lv " + machineLevel(id));
  renderAll();
  saveGame();
}

/* ---------- combo ---------- */

function bumpCombo(good) {
  if (good) {
    state.combo = Math.min(5, state.combo + 1);
    state.bestCombo = Math.max(state.bestCombo, state.combo);
  } else if (state.combo > 0) {
    state.combo = 0;
  }
}

/* ---------- buffs ---------- */

function buffActive(id) {
  var b = state.buffs[id];
  return !!(b && b.until > Date.now());
}

function setBuff(id, ms, data) {
  state.buffs[id] = { until: Date.now() + ms };
  if (data) for (var k in data) state.buffs[id][k] = data[k];
}

function clearBuff(id) { delete state.buffs[id]; }

function buffLeft(id) {
  var b = state.buffs[id];
  return b ? Math.max(0, b.until - Date.now()) : 0;
}
