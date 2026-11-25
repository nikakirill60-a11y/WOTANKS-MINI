// A ground cursor on the game board. No second world/renderer, target tracking or saved state.
class ArtillerySight {
  constructor(bounds, point) {
    this.bounds = bounds;
    this.x = this.y = this.focus = this.level = 0;
    this.moveTo(point.x, point.y);
  }
  static fov = 50;
  static raisedPitch = .5; // a game animation pose inside the supplied mount limits
  get zoom() { return 2 ** this.level; }
  get altitude() { return 850 / this.zoom; }
  // FOV 50°, looking straight down. The HUD ring and pointer motion use this same projection.
  get span() { return 2 * this.altitude * Math.tan(ArtillerySight.fov * Math.PI / 360); }
  get radius() { return 7 + 40 * (1 - this.focus); }
  moveTo(x, y) {
    const nx = bounded(x, -this.bounds.x, this.bounds.x), ny = bounded(y, -this.bounds.y, this.bounds.y);
    this.focus = Math.max(0, this.focus - Math.hypot(nx - this.x, ny - this.y) / 90);
    this.x = nx; this.y = ny; this.h = surfaceHeight(nx, ny);
  }
  pan(dx, dy, pixels, sensitivity) {
    const k = this.span / Math.max(1, pixels) * bounded(sensitivity, .3, 2.5);
    this.moveTo(this.x + dx * k, this.y + dy * k);
  }
  bearing(p) { return Math.atan2(this.y - p.y, this.x - p.x); }
  close(p) { return Math.hypot(this.x - p.x, this.y - p.y) < 35; }
  steer(p) {
    const a = this.bearing(p);
    return this.close(p) || p.canTraverseTo(a) ? 0 : bounded(wrapAngle(a - p.angle) / .3, -1, 1);
  }
  aligned(p) {
    const a = this.bearing(p);
    return !this.close(p) && p.canTraverseTo(a) && Math.abs(wrapAngle(a - p.tAngle)) < .035 && Math.abs(p.aimPitch - ArtillerySight.raisedPitch) < .08;
  }
  step(p, dt, holding) {
    if (!holding) {
      p.setLook(this.bearing(p), ArtillerySight.raisedPitch);
      p.slewSight(.75 * dt, .85 * dt);
    }
    const steady = !holding && !p.isMoving && !p.airborne && Math.abs(p.yawRate) < .025 && this.aligned(p);
    this.focus = bounded(this.focus + (steady ? dt / 2.4 : -dt * 1.8), 0, 1);
  }
  plot(shell) {
    // Sample once at the click. Moving the cursor, zooming or leaving the sight cannot steer a shell.
    const a = Math.random() * 2 * Math.PI, r = Math.sqrt(Math.random()) * this.radius;
    const x = bounded(this.x + Math.cos(a) * r, -this.bounds.x, this.bounds.x);
    const y = bounded(this.y + Math.sin(a) * r, -this.bounds.y, this.bounds.y);
    const d = Math.hypot(x - shell.x, y - shell.y);
    this.focus = 0;
    return { x0:shell.x, y0:shell.y, h0:shell.h, x, y, h:surfaceHeight(x,y) - .1,
      lift:Math.min(380, 65 + d * .19), frames:Math.max(1, Math.round((48 + Math.min(90, d / 40)) / shell.shooter.shellSpeedMul)), tick:0 };
  }
}

// An arcade animation between two board positions, stepped only by the fixed game clock.
// Sweep each chord through the SAME scene colliders as ordinary shots; cover can interrupt the tween.
function artilleryStep(b) {
  const a = b.arc, t = ++a.tick / a.frames;
  const dx = a.x0 + (a.x - a.x0) * t - b.x, dy = a.y0 + (a.y - a.y0) * t - b.y;
  const dh = a.h0 + (a.h - a.h0) * t + Math.sin(Math.PI * t) * a.lift - b.h;
  const length = Math.hypot(dx, dy, dh) || .001;
  b.dx = dx / length; b.dy = dy / length; b.dh = dh / length; b.a = Math.atan2(dy, dx);
  return length;
}

// Small near-miss bonus at a ground impact. No second direct hit, friendly fire, or splash through cover.
function artilleryBurst(b) {
  const radius = 33;
  spawnParticles(b.x, b.y, '#ffb65b', 16, 3.4, 20, b.h + 1);
  for (const u of GameState.units) {
    if (u.dead || (u.team === 'enemy') === (b.team === 'enemy')) continue;
    const dx = u.x - b.x, dy = u.y - b.y, dh = u.aimHeight - (b.h + 1);
    const d = Math.hypot(dx, dy, dh);
    if (d < .001 || d >= radius) continue;
    if (traceBattleRay(b.x, b.y, b.h + 1, dx/d, dy/d, dh/d, d, b.shooter, true).hit) continue;
    const dmg = Math.round(b.dmg * .5 * (1 - d / radius));
    if (dmg > 0) damageUnit({...b, dmg, a: Math.atan2(dy, dx)}, u, 'hull');
  }
}
