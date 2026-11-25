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

// The Type 5 Heavy mesh needs 5.83 m around its pivot at any heading. Plan for
// the entire hull, including its offset, not just the half-width of the tracks.
const BOT_CLEARANCE = 5.9 * BATTLE_UNITS_PER_METRE;
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
    this.elevation = new Float32Array(this.size);
    for (let n = 0; n < this.size; n++) {
      const p = this.point(n);
      this.elevation[n] = arena.ground?.at(p.x, p.y) || 0;
    }
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
    // Rasterise each footprint once, rather than scanning every wall at every cell.
    // An obstacle clips the WHOLE cell (half-cell margin); mud costs use its centre.
    for (let j = 0; j < this.rows; j++)
      for (let i = 0; i < this.cols; i++)
        this.blocked[j * this.cols + i] = !this.inside(
          (i + 0.5) * this.dx - this.W,
          (j + 0.5) * this.dy - this.H
        );
    const fill = (r, px, py, grid, value) => {
      const left = Math.max(0, Math.ceil((r.x - px + this.W) / this.dx - 0.5));
      const right = Math.min(this.cols - 1, Math.floor((r.x + r.w + px + this.W) / this.dx - 0.5));
      const top = Math.max(0, Math.ceil((r.y - py + this.H) / this.dy - 0.5));
      const bottom = Math.min(this.rows - 1, Math.floor((r.y + r.h + py + this.H) / this.dy - 0.5));
      for (let j = top; j <= bottom; j++) grid.fill(value, j * this.cols + left, j * this.cols + right + 1);
    };
    for (const r of this.obstacles)
      fill(r, BOT_CLEARANCE + this.dx / 2, BOT_CLEARANCE + this.dy / 2, this.blocked, 1);
    for (const r of this.slow) fill(r, 0, 0, this.terrain, 1.8);
  }

  inside(x, y) {
    return Math.abs(x) <= this.W - BOT_CLEARANCE && Math.abs(y) <= this.H - BOT_CLEARANCE;
  }
  clear(ax, ay, bx, by) {
    if (!this.inside(ax, ay) || !this.inside(bx, by)) return false;
    const a = this.cell(ax, ay),
      b = this.cell(bx, by);
    // A segment inside one completely walkable cell cannot intersect an inflated
    // obstacle. This is the usual case for 29 moving NPCs' short track steps.
    if (a === b && !this.blocked[a]) return true;
    return !this.obstacles.some((r) => crossesMapRect(ax, ay, bx, by, r, BOT_CLEARANCE));
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
          const climb = Math.max(0, this.elevation[next] - this.elevation[n]) / this.dx;
          const d = cost[n] + (i && j ? 1.4143 : 1) * this.terrain[next] + climb * 2.5 + congestion[next];
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

function battleFormation(arena, nav, teams) {
  if (teams[0].length === 1)
    return [
      { id: teams[0][0], x: -148, y: 0, team: 'player', angle: 0 },
      { id: teams[1][0], x: 135, y: 0, team: 'enemy', angle: Math.PI, practice: true }
    ];
  const units = [],
    [home, away] = arena.bases,
    angle = Math.atan2(away.y - home.y, away.x - home.x);
  const ahead = { x: Math.cos(angle), y: Math.sin(angle) },
    across = { x: -ahead.y, y: ahead.x };
  const middle = Math.floor(arena.hubs.length / 2),
    lanes = [middle, middle - 1, middle + 1];
  if (teams[0].length >= 15) lanes.push(0, arena.hubs.length - 1);
  const first = arena.hubs[0], last = arena.hubs.at(-1);
  const orientation = Math.sign((last.x - first.x) * across.x + (last.y - first.y) * across.y) || 1;
  const mobility = (id) => DB[id].speed + (DB[id].cls === 'lt' ? 14 : DB[id].cls === 'mt' ? 5 : 0);
  for (const [side, roster] of teams.entries()) {
    // Choose scouts from THIS team's actual vehicles. Leave its first slot and
    // base artillery out of survey duty, even if the SPG has a high top speed.
    const scouts = new Map();
    for (let i = 1; i < roster.length; i++) {
      if (DB[roster[i]].cls === 'spg') continue;
      const lane = lanes[i % lanes.length], prior = scouts.get(lane);
      if (prior === undefined || mobility(roster[i]) > mobility(roster[prior])) scouts.set(lane, i);
    }
    for (const [i, id] of roster.entries()) {
      const lane = lanes[i % lanes.length], row = Math.floor(i / lanes.length);
      const team = side ? 'enemy' : i ? 'ally' : 'player';
      const guard = team !== 'player' && DB[id].cls === 'spg';
      // Bot artillery gets a legal berth by its base marker, not a distant scout lane.
      const back = (side ? 1 : -1) * (guard ? 110 : row * 96);
      const offset = guard ? (side ? -85 : 85) : orientation * (lane - middle) * arena.spread + (row % 2 ? 38 : 0);
      const x = arena.bases[side].x + back * ahead.x + offset * across.x,
        y = arena.bases[side].y + back * ahead.y + offset * across.y;
      const n = nav.nearest(x, y, (p) => units.every((u) => (u.x - p.x) ** 2 + (u.y - p.y) ** 2 >= (2 * BOT_CLEARANCE) ** 2));
      if (n < 0) throw new Error('Не удалось разместить команду на карте.');
      units.push({ ...nav.point(n), id, team, angle: angle + side * Math.PI, lane, index: i, scout: scouts.get(lane) === i, side });
    }
  }
  return units;
}
