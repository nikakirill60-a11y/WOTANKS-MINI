// Footprint contacts operate in the horizontal map plane. Use the actual hull,
// not the barrel, a screen-space radius or the vehicle's research tier.
const TrackContact = (() => {
  function shape(u) {
    if (u._foot && u._foot.asset === u.modelAsset) return u._foot;
    const s = u.modelScale,
      b = u.modelAsset?.hitHull || u.modelAsset?.hull?.boundingBox;
    const L = b ? ((b.max.z - b.min.z) * s) / 2 : 22 * u.s,
      W = b ? ((b.max.x - b.min.x) * s) / 2 : 13 * u.s;
    return (u._foot = {
      asset: u.modelAsset,
      L,
      W,
      along: b ? ((b.max.z + b.min.z) * s) / 2 : 0,
      left: b ? ((b.max.x + b.min.x) * s) / 2 : 0,
      reach: Math.hypot(L, W)
    });
  }
  function pose(u, x = u.x, y = u.y) {
    const f = shape(u),
      c = Math.cos(u.angle),
      s = Math.sin(u.angle);
    return {
      x: x + c * f.along + s * f.left,
      y: y + s * f.along - c * f.left,
      c,
      s,
      L: f.L,
      W: f.W,
      r: f.reach
    };
  }
  function wallBox(w) {
    return (
      w._foot ||
      (w._foot = {
        x: w.x + w.w / 2,
        y: w.y + w.h / 2,
        L: w.w / 2,
        W: w.h / 2,
        c: 1,
        s: 0,
        r: Math.hypot(w.w, w.h) / 2
      })
    );
  }
  // Separating-axis test. Return the minimum translation direction from b to a.
  function overlap(a, b) {
    const x = a.x - b.x,
      y = a.y - b.y;
    if (Math.abs(x) > a.r + b.r || Math.abs(y) > a.r + b.r) return null;
    let depth = Infinity,
      nx = 0,
      ny = 0;
    for (let i = 0; i < 4; i++) {
      const k = i < 2 ? a : b,
        dx = i % 2 ? -k.s : k.c,
        dy = i % 2 ? k.c : k.s,
        d = dx * x + dy * y;
      const t =
        a.L * Math.abs(dx * a.c + dy * a.s) +
        a.W * Math.abs(dy * a.c - dx * a.s) +
        b.L * Math.abs(dx * b.c + dy * b.s) +
        b.W * Math.abs(dy * b.c - dx * b.s) -
        Math.abs(d);
      if (t <= 0) return null;
      if (t < depth) {
        depth = t;
        const sign = d < 0 ? -1 : 1;
        nx = sign * dx;
        ny = sign * dy;
      }
    }
    return { nx, ny, depth };
  }
  // Closest point on the hull to a round trunk, in the hull's local basis.
  function trunk(a, t) {
    const X = t.x - a.x,
      Y = t.y - a.y;
    if (Math.abs(X) > a.r + t.r || Math.abs(Y) > a.r + t.r) return null;
    const l = X * a.c + Y * a.s,
      w = -X * a.s + Y * a.c;
    let dx = bounded(l, -a.L, a.L) - l,
      dy = bounded(w, -a.W, a.W) - w;
    const dist = Math.hypot(dx, dy);
    if (dist >= t.r) return null;
    let depth = t.r - dist;
    if (dist) {
      dx /= dist;
      dy /= dist;
    } else if (a.L - Math.abs(l) < a.W - Math.abs(w)) {
      dx = l < 0 ? 1 : -1;
      depth += a.L - Math.abs(l);
    } else {
      dy = w < 0 ? 1 : -1;
      depth += a.W - Math.abs(w);
    }
    return { nx: dx * a.c - dy * a.s, ny: dx * a.s + dy * a.c, depth };
  }
  function move(u, dx, dy, nav) {
    const { bounds } = GameState.arena,
      box = pose(u),
      f = shape(u),
      M = BATTLE_UNITS_PER_METRE;
    const ex = Math.abs(box.c) * f.L + Math.abs(box.s) * f.W,
      ey = Math.abs(box.s) * f.L + Math.abs(box.c) * f.W;
    const ox = box.x - u.x,
      oy = box.y - u.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, Math.min(4, f.W * 0.45))));
    let touch = false;
    for (let i = 0; i < steps; i++) {
      let x = u.x + dx / steps,
        y = u.y + dy / steps;
      const bx = bounded(
          x,
          Math.max(-bounds.x + 5 * M, -bounds.x + ex - ox),
          Math.min(bounds.x - 5 * M, bounds.x - ex - ox)
        ),
        by = bounded(
          y,
          Math.max(-bounds.y + 5 * M, -bounds.y + ey - oy),
          Math.min(bounds.y - 5 * M, bounds.y - ey - oy)
        );
      if (bx !== x || by !== y) touch = true;
      x = bx;
      y = by;
      box.x = x + ox;
      box.y = y + oy;
      for (const w of GameState.walls) {
        if (
          !w.solid ||
          box.x + ex <= w.x ||
          box.x - ex >= w.x + w.w ||
          box.y + ey <= w.y ||
          box.y - ey >= w.y + w.h
        )
          continue;
        const hit = overlap(box, wallBox(w));
        if (!hit) continue;
        touch = true;
        const a = hit.nx * (hit.depth + 0.001),
          b = hit.ny * (hit.depth + 0.001);
        x += a;
        y += b;
        box.x += a;
        box.y += b;
      }
      const arena = GameState.arena;
      if (arena.trees)
        for (const tree of arena.trees) {
          if (tree.fallen) continue;
          const hit = trunk(box, tree);
          if (!hit) continue;
          if (Math.abs(u.driveSpeed) > 0.8 || TrackDrive.profile(u).mass > 40) {
            tree.fallen = true;
            tree.angle = Math.atan2(-hit.ny, -hit.nx);
            arena.treeRevision++;
            u.treeDrag = (u.treeDrag || 1) * 0.88;
            continue;
          }
          touch = true;
          const a = hit.nx * (hit.depth + 0.001),
            b = hit.ny * (hit.depth + 0.001);
          x += a;
          y += b;
          box.x += a;
          box.y += b;
        }
      if (nav && !nav.clear(u.x, u.y, x, y)) {
        touch = true;
        if (nav.clear(u.x, u.y, x, u.y)) y = u.y;
        else if (nav.clear(u.x, u.y, u.x, y)) x = u.x;
        else break;
      }
      u.x = x;
      u.y = y;
    }
    return touch;
  }
  function push(u, b, dx, dy) {
    if (u.practiceTarget) return 0;
    const x = u.x,
      y = u.y,
      h = surfaceHeight(x, y);
    move(u, dx, dy, u.bot ? GameState.navigation : null);
    b.x += u.x - x;
    b.y += u.y - y;
    if (!u.airborne) u.rideHeight += surfaceHeight(u.x, u.y) - h;
    return bounded(((u.x - x) * dx + (u.y - y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  }
  function changeSpeed(u, delta) {
    if (u.practiceTarget) return;
    u.driveSpeed += delta;
    const v = (u.driveSpeed * BATTLE_UNITS_PER_METRE) / 60;
    u.vx = v * Math.cos(u.angle);
    u.vy = v * Math.sin(u.angle);
    u.speedKmh = u.driveSpeed * 3.6;
  }
  function pairs(units, tick, onRam) {
    const boxes = units.map((u) => (u.dead ? null : pose(u)));
    // Two relaxation passes for a queue of hulls. Every correction respects
    // solid scenery and the bot's dry navigation corridor, even at the shoreline.
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < units.length; i++)
        for (let j = i + 1; j < units.length; j++) {
          const a = units[i],
            b = units[j],
            A = boxes[i],
            B = boxes[j];
          if (
            !A ||
            !B ||
            a.dead ||
            b.dead ||
            Math.abs(A.x - B.x) > A.r + B.r ||
            Math.abs(A.y - B.y) > A.r + B.r
          )
            continue;
          const q = overlap(A, B);
          if (!q) continue;
          const m = TrackDrive.profile(a).mass,
            n = TrackDrive.profile(b).mass;
          const share = a.practiceTarget ? 0 : b.practiceTarget ? 1 : n / (m + n),
            depth = q.depth + 0.002,
            dx = q.nx * depth,
            dy = q.ny * depth;
          const moved = share ? share * push(a, A, dx * share, dy * share) : 0,
            other = 1 - moved;
          const rest = other * (1 - push(b, B, -dx * other, -dy * other));
          if (rest > 0.001) push(a, A, dx * rest, dy * rest);
          const dotA = A.c * q.nx + A.s * q.ny,
            dotB = B.c * q.nx + B.s * q.ny;
          const towardA = -a.driveSpeed * dotA,
            towardB = b.driveSpeed * dotB,
            closing = towardA + towardB;
          if (closing <= 0) continue;
          changeSpeed(a, closing * share * dotA);
          changeSpeed(b, -closing * (1 - share) * dotB);
          a.driveBlocked = b.driveBlocked = true;
          if (closing > 2.5 && onRam && (a.team === 'enemy') !== (b.team === 'enemy')) {
            const recent = a._contacts || (a._contacts = new WeakMap());
            if ((recent.get(b) ?? -Infinity) + 60 > tick) continue;
            recent.set(b, tick);
            const severity = (closing - 2.5) ** 2 * 0.85;
            onRam(a, b, Math.round((severity * n) / (m + n)), Math.round((severity * m) / (m + n)));
          }
        }
  }
  return { shape, pose, overlap, move, pairs };
})();
