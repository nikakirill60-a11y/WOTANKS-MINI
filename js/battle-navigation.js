// Ground navigation is deliberately independent of WebGL. The coarse cells are for
// planning only: vehicles still steer continuously and use the ordinary collision rules.
function crossesMapRect(ax, ay, bx, by, r, pad = 0) {
  const x0 = r.x - pad,
    x1 = r.x + r.w + pad,
    y0 = r.y - pad,
    y1 = r.y + r.h + pad;
  if ((ax < x0 && bx < x0) || (ax > x1 && bx > x1) || (ay < y0 && by < y0) || (ay > y1 && by > y1))
    return false;
  let lo = 0,
    hi = 1;
  const dx = bx - ax,
    dy = by - ay;
  if (dx) {
    const a = (x0 - ax) / dx,
      b = (x1 - ax) / dx;
    lo = Math.max(lo, Math.min(a, b));
    hi = Math.min(hi, Math.max(a, b));
  }
  if (dy) {
    const a = (y0 - ay) / dy,
      b = (y1 - ay) / dy;
    lo = Math.max(lo, Math.min(a, b));
    hi = Math.min(hi, Math.max(a, b));
  }
  return lo <= hi;
}

// Covers the widest hull in the playable branch, including the collision margin (world units).
const BOT_CLEARANCE = 32;
class BattleNavigation {
  constructor(arena) {
    this.arena = arena;
    this.W = arena.bounds.x;
    this.H = arena.bounds.y;
    this.cols = Math.ceil((2 * this.W) / 54);
    this.rows = Math.ceil((2 * this.H) / 54);
    this.dx = (2 * this.W) / this.cols;
    this.dy = (2 * this.H) / this.rows;
    this.size = this.cols * this.rows;
    this.terrain = new Float32Array(this.size);
    this.blocked = new Uint8Array(this.size);
    this.cost = new Float32Array(this.size);
    this.parent = new Int32Array(this.size);
    this.closed = new Uint8Array(this.size);
    this.congestion = new Uint8Array(this.size);
    this.rebuild();
  }
  rebuild() {
    this.revision = this.arena.revision;
    this.obstacles = [...this.arena.walls.filter((w) => w.solid), ...this.arena.water];
    this.slow = this.arena.zones.filter((z) => z.type === 'mud');
    this.terrain.fill(1);
    this.blocked.fill(0);
    for (let n = 0; n < this.size; n++) {
      const { x, y } = this.point(n);
      // Mark the entire cell, not just its centre: a route cannot cut through a thin wall.
      this.blocked[n] =
        !this.inside(x, y) ||
        this.obstacles.some(
          (r) =>
            x >= r.x - BOT_CLEARANCE - this.dx / 2 &&
            x <= r.x + r.w + BOT_CLEARANCE + this.dx / 2 &&
            y >= r.y - BOT_CLEARANCE - this.dy / 2 &&
            y <= r.y + r.h + BOT_CLEARANCE + this.dy / 2
        );
      if (this.slow.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h))
        this.terrain[n] = 1.8;
    }
  }
  inside(x, y) {
    return Math.abs(x) <= this.W - BOT_CLEARANCE && Math.abs(y) <= this.H - BOT_CLEARANCE;
  }
  clear(ax, ay, bx, by) {
    return (
      this.inside(ax, ay) &&
      this.inside(bx, by) &&
      !this.obstacles.some((r) => crossesMapRect(ax, ay, bx, by, r, BOT_CLEARANCE))
    );
  }
  point(n) {
    return {
      x: ((n % this.cols) + 0.5) * this.dx - this.W,
      y: (Math.floor(n / this.cols) + 0.5) * this.dy - this.H
    };
  }
  cell(x, y) {
    const i = Math.max(0, Math.min(this.cols - 1, Math.floor((x + this.W) / this.dx)));
    const j = Math.max(0, Math.min(this.rows - 1, Math.floor((y + this.H) / this.dy)));
    return i + j * this.cols;
  }
  nearest(x, y, accept) {
    const first = this.cell(x, y),
      cx = first % this.cols,
      cy = Math.floor(first / this.cols);
    for (let ring = 0; ring < Math.max(this.cols, this.rows); ring++) {
      let best = -1,
        dist = Infinity;
      for (let j = Math.max(0, cy - ring); j <= Math.min(this.rows - 1, cy + ring); j++) {
        for (let i = Math.max(0, cx - ring); i <= Math.min(this.cols - 1, cx + ring); i++) {
          if (Math.max(Math.abs(i - cx), Math.abs(j - cy)) !== ring) continue;
          const n = i + j * this.cols;
          if (this.blocked[n]) continue;
          const p = this.point(n),
            d = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d < dist && (!accept || accept(p))) {
            best = n;
            dist = d;
          }
        }
      }
      if (best !== -1) return best;
    }
    return -1;
  }
  // A* with octile distance, no diagonal corner cutting. Each bot keeps the resulting
  // waypoints. Scratch grids are shared and searches are staggered by the AI scheduler.
  route(from, to, traffic = []) {
    if (
      !traffic.length &&
      this.clear(from.x, from.y, to.x, to.y) &&
      !this.slow.some((r) => crossesMapRect(from.x, from.y, to.x, to.y, r))
    )
      return [{ x: to.x, y: to.y }];
    const start = this.nearest(from.x, from.y, (p) => this.clear(from.x, from.y, p.x, p.y)),
      goal = this.nearest(to.x, to.y);
    if (start < 0 || goal < 0) return [];
    const { cols, rows, cost, closed, parent, congestion } = this,
      gx = goal % cols,
      gy = Math.floor(goal / cols);
    cost.fill(Infinity);
    closed.fill(0);
    congestion.fill(0);
    cost[start] = 0;
    parent[start] = -1;
    for (const u of traffic) {
      const cell = this.cell(u.x, u.y),
        cx = cell % cols,
        cy = Math.floor(cell / cols);
      for (let j = Math.max(0, cy - 1); j <= Math.min(rows - 1, cy + 1); j++)
        for (let i = Math.max(0, cx - 1); i <= Math.min(cols - 1, cx + 1); i++)
          congestion[j * cols + i] = i === cx && j === cy ? 18 : Math.max(4, congestion[j * cols + i]);
    }
    const heap = [];
    const push = (n, f) => {
      const item = { n, f };
      let i = heap.length;
      heap.push(item);
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p].f <= f) break;
        heap[i] = heap[p];
        i = p;
      }
      heap[i] = item;
    };
    const pop = () => {
      const n = heap[0].n,
        last = heap.pop();
      if (heap.length) {
        let i = 0;
        while (2 * i + 1 < heap.length) {
          let c = 2 * i + 1;
          if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++;
          if (last.f <= heap[c].f) break;
          heap[i] = heap[c];
          i = c;
        }
        heap[i] = last;
      }
      return n;
    };
    push(start, 0);
    while (heap.length) {
      const n = pop();
      if (closed[n]) continue;
      if (n === goal) break;
      closed[n] = 1;
      const x = n % cols,
        y = Math.floor(n / cols);
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          if (!(i || j) || x + i < 0 || x + i >= cols || y + j < 0 || y + j >= rows) continue;
          const next = n + i + j * cols;
          if (
            this.blocked[next] ||
            closed[next] ||
            (i && j && (this.blocked[n + i] || this.blocked[n + j * cols]))
          )
            continue;
          const d = cost[n] + (i && j ? 1.4143 : 1) * this.terrain[next] + congestion[next];
          if (d + 0.0001 >= cost[next]) continue;
          parent[next] = n;
          cost[next] = d;
          const dx = Math.abs(gx - x - i),
            dy = Math.abs(gy - y - j);
          push(next, d + Math.max(dx, dy) + 0.4142 * Math.min(dx, dy));
        }
    }
    if (!Number.isFinite(cost[goal])) return [];
    const cells = [];
    for (let n = goal; n !== -1; n = parent[n]) cells.push(n);
    cells.reverse();
    const path = [];
    for (let i = 0; i < cells.length; i++) {
      if (i > 0 && i < cells.length - 1 && cells[i] - cells[i - 1] === cells[i + 1] - cells[i]) continue;
      path.push(this.point(cells[i]));
    }
    const end = path[path.length - 1];
    if (this.clear(end.x, end.y, to.x, to.y)) path.push({ x: to.x, y: to.y });
    return path;
  }
}

function battleFormation(arena, nav, roster, practiceEnemy) {
  if (practiceEnemy)
    return [
      { id: roster[0], x: -148, y: 0, team: 'player', angle: 0 },
      { id: practiceEnemy, x: 135, y: 0, team: 'enemy', angle: Math.PI, practice: true }
    ];
  const units = [],
    [home, away] = arena.bases,
    angle = Math.atan2(away.y - home.y, away.x - home.x);
  const ahead = { x: Math.cos(angle), y: Math.sin(angle) },
    across = { x: -ahead.y, y: ahead.x };
  // Keep each spawn file on the same side as its lane, including N/S deployments.
  const orientation =
    Math.sign(
      (arena.hubs[2].x - arena.hubs[0].x) * across.x + (arena.hubs[2].y - arena.hubs[0].y) * across.y
    ) || 1;
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < roster.length; i++) {
      const lane = [1, 0, 2][i % 3],
        row = Math.floor(i / 3),
        back = (side ? 1 : -1) * row * 83;
      const offset = orientation * (lane - 1) * arena.spread + (row % 2 ? 37 : 0);
      const x = arena.bases[side].x + back * ahead.x + offset * across.x,
        y = arena.bases[side].y + back * ahead.y + offset * across.y;
      const n = nav.nearest(x, y, (p) => units.every((u) => (u.x - p.x) ** 2 + (u.y - p.y) ** 2 >= 73 ** 2));
      if (n < 0) throw new Error('Не удалось разместить команду на карте.');
      units.push({
        ...nav.point(n),
        id: roster[i],
        team: side ? 'enemy' : i ? 'ally' : 'player',
        angle: angle + side * Math.PI,
        lane,
        index: i,
        side
      });
    }
  return units;
}
