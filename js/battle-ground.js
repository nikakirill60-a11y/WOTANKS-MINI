// Both the mesh and the simulation use the same two triangles per cell. Horizontal
// coordinates and returned heights are CITY TANKS world units (nine per metre).
class BattleGround {
  constructor(arena) {
    this.W = arena.bounds.x;
    this.H = arena.bounds.y;
    const m = BATTLE_UNITS_PER_METRE;
    this.cols = Math.ceil((2 * this.W) / (7 * m));
    this.rows = Math.ceil((2 * this.H) / (7 * m));
    this.dx = (2 * this.W) / this.cols;
    this.dy = (2 * this.H) / this.rows;
    const W = this.W / m,
      H = this.H / m;
    const hills = (arena.spec?.hills || []).map(([x, y, rx, ry, deg, h]) => ({
      x,
      y,
      rx: Math.max(rx, h * 7.9),
      ry: Math.max(ry, h * 7.9),
      h,
      c: Math.cos((deg * Math.PI) / 180),
      s: Math.sin((deg * Math.PI) / 180)
    }));
    const relief = (x, y) => {
      let h = 0;
      for (const r of hills) {
        const dx = x - r.x,
          dy = y - r.y,
          q = ((dx * r.c + dy * r.s) / r.rx) ** 2 + ((dy * r.c - dx * r.s) / r.ry) ** 2;
        if (q < 1) h = Math.max(h, r.h * (0.5 + 0.5 * Math.cos(Math.PI * Math.sqrt(q))));
      }
      return h;
    };
    // A level building pad need NOT be at sea level. Pick a feasible elevation for
    // each pad, leaving room for tank-climbable ramps between neighbouring pads.
    // The extra cell on all sides keeps every triangle under each footprint level.
    const marginX = this.dx / m + 0.1,
      marginY = this.dy / m + 0.1,
      grade = 0.173;
    const pad = (r, fixed) => ({
      x0: r.x / m - marginX,
      x1: (r.x + r.w) / m + marginX,
      y0: r.y / m - marginY,
      y1: (r.y + r.h) / m + marginY,
      h: fixed ? 0 : relief((r.x + r.w / 2) / m, (r.y + r.h / 2) / m),
      wall: fixed ? null : r
    });
    const separation = (x, y) => Math.sqrt(Math.max(0, x) ** 2 + Math.max(0, y) ** 2);
    const pads = [
      ...arena.walls.map((r) => pad(r, false)),
      ...arena.water.map((r) => pad(r, true)),
      ...(arena.zones || []).filter(r=>r.type==='runway').map(r=>pad(r,true)), // level end to end, not painted over a hill
      pad({ x: -32 * m, y: -11 * m, w: 64 * m, h: 22 * m }, true)
    ];
    // Edge, shoreline and practice are hard zero-height anchors. A shortest-path
    // relaxation enforces the same grade even across a chain of touching pads.
    for (const p of pads)
      p.h = Math.min(p.h, Math.max(0, Math.min(W + p.x0, W - p.x1, H + p.y0, H - p.y1)) * grade);
    for (let i = 0; i < pads.length; i++) {
      let p = null;
      for (const q of pads) if (!q.done && (!p || q.h < p.h)) p = q;
      p.done = true;
      for (const q of pads)
        if (!q.done)
          q.h = Math.min(
            q.h,
            p.h + grade * separation(Math.max(p.x0 - q.x1, q.x0 - p.x1), Math.max(p.y0 - q.y1, q.y0 - p.y1))
          );
    }
    for (const p of pads) if (p.wall) p.wall.baseHeight = Math.fround(p.h * m);
    this.samples = new Float32Array((this.cols + 1) * (this.rows + 1));
    this.min = this.max = 0;
    for (let j = 0; j <= this.rows; j++)
      for (let i = 0; i <= this.cols; i++) {
        const x = (i * this.dx - this.W) / m,
          y = (j * this.dy - this.H) / m;
        let lo = 0,
          hi = Math.max(0, Math.min(W - Math.abs(x), H - Math.abs(y))) * grade;
        for (const p of pads) {
          const d = grade * separation(Math.max(p.x0 - x, x - p.x1), Math.max(p.y0 - y, y - p.y1));
          lo = Math.max(lo, p.h - d);
          hi = Math.min(hi, p.h + d);
        }
        let h = Math.max(lo, Math.min(hi, relief(x, y))) * m;
        for (const r of arena.water) {
          const inset = Math.min(x * m - r.x, r.x + r.w - x * m, y * m - r.y, r.y + r.h - y * m);
          if (inset > 0) h = -Math.min(3.6 * m, inset * 0.235);
        }
        this.samples[i + j * (this.cols + 1)] = h;
        this.min = Math.min(this.min, h);
        this.max = Math.max(this.max, h);
      }
  }
  value(k, u, v) {
    const a = this.samples,
      n = this.cols + 1;
    return u + v <= 1
      ? a[k] + u * (a[k + 1] - a[k]) + v * (a[k + n] - a[k])
      : a[k + n + 1] + (1 - u) * (a[k + n] - a[k + n + 1]) + (1 - v) * (a[k + 1] - a[k + n + 1]);
  }
  at(x, y) {
    if (this.min === this.max || Math.abs(x) >= this.W || Math.abs(y) >= this.H) return 0;
    const u = (x + this.W) / this.dx,
      v = (y + this.H) / this.dy,
      i = Math.min(this.cols - 1, Math.floor(u)),
      j = Math.min(this.rows - 1, Math.floor(v));
    return this.value(i + j * (this.cols + 1), u - i, v - j);
  }
  // First intersection of a finite ray with the heightfield. Walk only crossed
  // cells and split at each diagonal, so even a grazing ray cannot skip a ridge.
  ray(x, y, h, dx, dy, dh, limit) {
    const plane = dh < 0 ? -h / dh : Infinity;
    if (this.min === this.max) return plane >= 0 && plane <= limit ? plane : Infinity;
    if (h > this.max && h + dh * limit > this.max) return Infinity;
    let lo = 0,
      hi = limit;
    for (const [o, d, half] of [
      [x, dx, this.W],
      [y, dy, this.H]
    ]) {
      if (Math.abs(d) < 1e-12) {
        if (Math.abs(o) > half) return plane >= 0 && plane <= limit ? plane : Infinity;
      } else {
        const a = (-half - o) / d,
          b = (half - o) / d;
        lo = Math.max(lo, Math.min(a, b));
        hi = Math.min(hi, Math.max(a, b));
      }
    }
    if (plane >= 0 && plane < lo && plane <= limit) return plane;
    if (dh < 0 && h > this.max) lo = Math.max(lo, (this.max - h) / dh);
    const du = dx / this.dx,
      dv = dy / this.dy,
      u0 = (x + this.W) / this.dx,
      v0 = (y + this.H) / this.dy;
    let i = bounded(Math.floor(u0 + du * lo + (du < 0 ? -1e-9 : 0)), 0, this.cols - 1),
      j = bounded(Math.floor(v0 + dv * lo + (dv < 0 ? -1e-9 : 0)), 0, this.rows - 1);
    let tx = du ? ((du > 0 ? i + 1 : i) - u0) / du : Infinity,
      ty = dv ? ((dv > 0 ? j + 1 : j) - v0) / dv : Infinity;
    while (lo <= hi && i >= 0 && j >= 0 && i < this.cols && j < this.rows) {
      const end = Math.max(lo, Math.min(hi, tx, ty)),
        k = j * (this.cols + 1) + i,
        U = u0 - i,
        V = v0 - j;
      const gap = (t) => h + dh * t - this.value(k, U + du * t, V + dv * t);
      let g = gap(lo),
        start = lo;
      if (g <= 0) return lo;
      const diag = du + dv ? (1 - U - V) / (du + dv) : Infinity;
      if (diag > lo && diag < end) {
        const next = gap(diag);
        if (next <= 0) return lo + ((diag - lo) * g) / (g - next);
        g = next;
        start = diag;
      }
      const last = gap(end);
      if (last <= 0) return start + ((end - start) * g) / (g - last);
      if (end >= hi) break;
      if (tx <= end + 1e-8) {
        i += Math.sign(du);
        tx += Math.abs(1 / du);
      }
      if (ty <= end + 1e-8) {
        j += Math.sign(dv);
        ty += Math.abs(1 / dv);
      }
      lo = end;
    }
    // A zero-height apron exists only OUTSIDE the grid. In particular a ray
    // ending exactly at sea level over a deep bed has not hit the terrain.
    if (
      plane >= 0 &&
      plane <= limit &&
      (Math.abs(x + dx * plane) >= this.W || Math.abs(y + dy * plane) >= this.H)
    )
      return plane;
    return Infinity;
  }
}
