var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
var reduced = motionQuery.matches;

if (motionQuery.addEventListener) {
  motionQuery.addEventListener("change", function (e) { reduced = e.matches; });
}

function spring(opts) {
  var to = opts.to;
  var response = opts.response || 0.35;
  var omega = (2 * Math.PI) / response;
  var k = omega * omega;
  var c = 2 * (opts.damping === undefined ? 1 : opts.damping) * omega;
  var x = opts.from;
  var v = opts.velocity || 0;
  var last = null;
  var raf = 0;
  var stopped = false;
  var restDelta = opts.restDelta === undefined ? 0.08 : opts.restDelta;
  var restSpeed = opts.restSpeed === undefined ? 0.6 : opts.restSpeed;

  function frame(now) {
    if (stopped) return;
    if (last === null) last = now;
    var dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 0;
    if (dt > 0.064) dt = 0.064;
    var steps = Math.max(1, Math.ceil(dt * 240));
    var h = dt / steps;
    for (var i = 0; i < steps; i++) {
      var a = -k * (x - to) - c * v;
      v += a * h;
      x += v * h;
    }
    var span = Math.abs(to - (opts.from || 0)) * 4 + 64;
    if (!isFinite(x) || !isFinite(v) || Math.abs(x - to) > span) {
      x = to;
      v = 0;
    }
    if (Math.abs(x - to) < restDelta && Math.abs(v) < restSpeed) {
      opts.onUpdate(to, 0);
      if (opts.onComplete) opts.onComplete();
      return;
    }
    opts.onUpdate(x, v);
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);

  return {
    stop: function () { stopped = true; cancelAnimationFrame(raf); },
    retarget: function (newTo, newVel) {
      to = newTo;
      if (newVel !== undefined) v = newVel;
      last = null;
    },
    get value() { return x; },
    get velocity() { return v; }
  };
}

function rubberband(overshoot, dim, constant) {
  var c = constant || 0.55;
  return (overshoot * dim * c) / (dim + c * Math.abs(overshoot));
}

function project(velocity, decel) {
  var d = decel || 0.998;
  return (velocity / 1000) * (d / (1 - d));
}
