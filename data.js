var START_CASH = 2500;
var TICK_MS = 1000;
var HISTORY = 60;
var SAVE_KEY = "ledger.save.v4";
var PRESTIGE_AT = 1e12;

var COINS = [
  { sym: "NVX", name: "Nova Systems", base: 128.40, vol: 1.6, drift: 0.05, floor: 0.5 },
  { sym: "HLX", name: "Helix Energy", base: 64.25, vol: 2.4, drift: 0.02, floor: 0.5 },
  { sym: "ORB", name: "Orbital Freight", base: 212.90, vol: 1.1, drift: 0.06, floor: 0.5 },
  { sym: "TID", name: "Tidewater Foods", base: 31.70, vol: 2.9, drift: -0.03, floor: 0.5 },
  { sym: "LUM", name: "Lumen Robotics", base: 445.00, vol: 1.8, drift: 0.09, floor: 0.5 },
  { sym: "KRT", name: "Kestrel Mining", base: 88.50, vol: 2.0, drift: 0.04, floor: 0.5, risky: true },
  { sym: "MOON", name: "Meme Vector", base: 0.05, vol: 34, drift: 0, floor: 0.000001, wild: true, risky: true }
];

var MACHINES = [
  { id: "pocket", name: "Pocket Rig", tag: "Budget", tier: 0, cost: 2400, rate: 90, desc: "A shoebox of fans. Prints all night." },
  { id: "cluster", name: "Card Cluster", tag: "Pro", tier: 1, cost: 22000, rate: 800, desc: "Twelve cards. Same box." },
  { id: "locker", name: "Server Locker", tag: "Pro", tier: 1, cost: 340000, rate: 13000, desc: "Racks and cable spaghetti." },
  { id: "hall", name: "Data Hall", tag: "Ultra", tier: 2, cost: 5400000, rate: 210000, desc: "A whole wing hums at once." },
  { id: "vault", name: "Fusion Vault", tag: "Ultra", tier: 2, cost: 86000000, rate: 3400000, desc: "Buries heat, pays for it." },
  { id: "orbital", name: "Orbital Rig", tag: "Hard", tier: 3, cost: 1400000000, rate: 56000000, desc: "No landlord. No excuses." },
  { id: "swarm", name: "Dyson Swarm", tag: "Hard", tier: 3, cost: 25000000000, rate: 1050000000, desc: "It works because it agrees to." },
  { id: "engine", name: "Reality Engine", tag: "Final", tier: 4, cost: 520000000000, rate: 21000000000, desc: "Prints money by believing in it." }
];

var MILESTONES = [
  1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15, 1e16, 1e17
];

var LEVEL_COST_MULT = 1.85;
var LEVEL_RATE_MULT = 1.4;

/* ---------- random events ---------- */

var EVENTS = [
  { id: "bull", name: "Bull Run", icon: "chart", weight: 22, dur: 30000, desc: "Everything is pumping." },
  { id: "crash", name: "Crash", icon: "crash", weight: 20, dur: 30000, desc: "The floor is falling out." },
  { id: "whale", name: "Whale", icon: "whale", weight: 20, dur: 12000, desc: "One asset is being hoovered up." },
  { id: "viral", name: "Meme Goes Viral", icon: "viral", weight: 18, dur: 15000, desc: "A random asset is exploding." },
  { id: "rug", name: "Rug Pull", icon: "rug", weight: 14, dur: 20000, desc: "A risky asset just got dumped on." },
  { id: "jackpot", name: "Jackpot", icon: "jackpot", weight: 6, dur: 6000, desc: "Someone left money on the floor." }
];

/* ---------- black market ---------- */

var BLACK_ITEMS = [
  { id: "overclock", name: "Overclock", price: 150000, mult: 3, desc: "Money / Second doubles for 30s.", tag: "2x" },
  { id: "freeze", name: "Deep Freeze", price: 380000, mult: 3, desc: "One price stops moving for 20s.", tag: "Freeze" },
  { id: "insurance", name: "Crash Cover", price: 1100000, mult: 3, desc: "Cancels the next Crash. Once.", tag: "Cover" },
  { id: "reroll", name: "Reroll", price: 620000, mult: 3, desc: "Swap the running event for a new one.", tag: "Reroll" },
  { id: "mooncover", name: "MOON Cover", price: 2600000, mult: 3, desc: "MOON cannot fall more than 50% for 60s.", tag: "MOON" }
];

