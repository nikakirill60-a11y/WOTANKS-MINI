// Match-local survey board. A sector is explored by physically entering it; this
// records visits, NOT visibility of every vehicle in it. Each side has its own board.
class BattleRecon {
  static cols = 7;
  static rows = 5;
  static reportLife = 300; // fixed 60 Hz ticks
  constructor(nav) {
    this.nav = nav;
    const n = BattleRecon.cols * BattleRecon.rows;
    this.teams = Array.from({ length: 2 }, () => ({
      visited: new Int32Array(n).fill(-1),
      count: 0,
      passes: new Uint32Array(n),
      claims: Array(n).fill(null),
      reports: new Map()
    }));
    this.width = (2 * nav.W) / BattleRecon.cols;
    this.height = (2 * nav.H) / BattleRecon.rows;
    this.rebuild();
  }
  cell(x, y) {
    const col = bounded(Math.floor((x + this.nav.W) / this.width), 0, BattleRecon.cols - 1);
    const row = bounded(Math.floor((y + this.nav.H) / this.height), 0, BattleRecon.rows - 1);
    return row * BattleRecon.cols + col;
  }
  rebuild() {
    const nav = this.nav,
      n = BattleRecon.cols * BattleRecon.rows;
    // Repeated searches shouldn't trace the same line through the centre of a
    // 100-metre sector. Snap alternate stops to safe cells of that SAME sector.
    // The deployment points belong to the public floor plan, not a hidden unit.
    this.stops = Array.from({ length: n }, (_, i) => {
      const left = (i % BattleRecon.cols) * this.width - nav.W,
        top = Math.floor(i / BattleRecon.cols) * this.height - nav.H;
      const cells = new Set();
      const add = (x, y) => {
        const k = nav.nearest(x, y);
        if (k >= 0) {
          const q = nav.point(k);
          if (this.cell(q.x, q.y) === i) cells.add(k);
        }
      };
      add(left + 0.5 * this.width, top + 0.5 * this.height);
      for (const b of nav.arena.bases) if (this.cell(b.x, b.y) === i) add(b.x, b.y);
      for (const [dx, dy] of [
        [0.25, 0.25],
        [0.75, 0.75],
        [0.25, 0.75],
        [0.75, 0.25]
      ])
        add(left + dx * this.width, top + dy * this.height);
      return Array.from(cells, (k) => nav.point(k));
    });
    this.anchors = this.stops.map((points) => points[0] || null);
    this.total = this.anchors.filter(Boolean).length;
    for (const team of this.teams)
      team.count = this.anchors.filter((p, i) => p && team.visited[i] >= 0).length;
  }
  sample(units, now) {
    for (const team of this.teams)
      for (const [key, p] of team.reports) if (p.until <= now) team.reports.delete(key);
    // The roster is stable throughout a match. Its slot is just a contact ID;
    // reading a report never requires looking up the source unit.
    for (const [key, u] of units.entries()) {
      if (u.dead) {
        if (u.bot?.sector >= 0) this.release(u);
        continue;
      }
      const side = u.team === 'enemy' ? 1 : 0,
        sector = this.cell(u.x, u.y),
        team = this.teams[side];
      if (this.anchors[sector]) {
        if (team.visited[sector] < 0) team.count++;
        team.visited[sector] = now;
      }
      // Only confirmed opposing sightings, one snapshot per contact. There is
      // no extra information about where a vehicle drove after disappearing.
      if (u.spotted)
        this.teams[1 - side].reports.set(key, { x: u.x, y: u.y, until: now + BattleRecon.reportLife });
    }
  }
  report(u, now) {
    let best = null,
      score = Infinity;
    const range = Math.max(this.width, this.height) * 3.2;
    for (const p of this.teams[u.bot.side].reports.values())
      if (p.until > now) {
        const d = Math.hypot(u.x - p.x, u.y - p.y);
        const age = now - (p.until - BattleRecon.reportLife),
          cost = d + age;
        if (d > 50 && d < range && cost < score) {
          best = p;
          score = cost;
        }
      }
    return best;
  }
  release(u) {
    const b = u.bot,
      team = this.teams[b.side];
    if (b.sector >= 0 && team.claims[b.sector] === u) team.claims[b.sector] = null;
    b.sector = -1;
  }
  destination(u, now) {
    const b = u.bot,
      team = this.teams[b.side],
      p = this.stops[b.sector]?.[b.stop];
    if (b.sector >= 0) {
      if (p && team.claims[b.sector] === u) {
        const d = Math.hypot(u.x - p.x, u.y - p.y);
        if (d < b.bestDistance - 18) {
          b.bestDistance = d;
          b.progressUntil = now + 540;
        }
        if (d > 42 && now < b.progressUntil) return p;
      }
      // Avoid immediately reclaiming a jammed/finished destination.
      b.skipSector = b.sector;
      b.firstSurvey = false;
      this.release(u);
    }
    const here = this.cell(u.x, u.y),
      scale = Math.min(this.width, this.height);
    let choice = -1,
      score = Infinity,
      known = true;
    for (let i = 0; i < this.stops.length; i++) {
      const stops = this.stops[i];
      if (!stops.length) continue;
      const q = stops[team.passes[i] % stops.length],
        owner = team.claims[i];
      if (i === here || i === b.skipSector || (owner && !owner.dead)) continue;
      const distance = Math.hypot(q.x - u.x, q.y - u.y) / scale;
      // Prefer unknown ground. Once the whole map has been visited, revisit the
      // oldest sectors. Initial scouts spread across the map's authored corridors.
      const visited = team.visited[i] >= 0;
      const age = visited ? (now - team.visited[i]) / 600 : 0;
      const lane = Math.hypot(q.x - b.hub.x, q.y - b.hub.y) / scale;
      const cost =
        distance * (b.firstSurvey ? 0.35 : 0.88) +
        lane * (b.firstSurvey ? 2.5 : 0.12) -
        age +
        ((i * 13 + b.order * 7) % 11) * 0.015;
      if ((!visited && known) || (visited === known && cost < score)) {
        known = visited;
        score = cost;
        choice = i;
      }
    }
    if (choice < 0) return null;
    team.claims[choice] = u;
    b.sector = choice;
    const stops = this.stops[choice];
    b.stop = team.passes[choice]++ % stops.length;
    const q = stops[b.stop];
    b.bestDistance = Math.hypot(q.x - u.x, q.y - u.y);
    b.progressUntil = now + 540;
    return q;
  }
}
