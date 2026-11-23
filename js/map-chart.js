// The hangar plan and HUD share the projection and actual colliders, not a separate
// illustration. Cache the static HUD layer until a building falls or the canvas resizes.
const MapChart = (() => {
  let cached = null;
  function layout(arena, w, h, pad) {
    const { x, y } = arena.bounds,
      scale = Math.min((w - pad * 2) / (2 * x), (h - pad * 2) / (2 * y));
    return {
      scale,
      left: w / 2 - x * scale,
      top: h / 2 - y * scale,
      width: 2 * x * scale,
      height: 2 * y * scale
    };
  }
  function paint(canvas, arena, large) {
    const w = canvas.width,
      h = canvas.height,
      c = canvas.getContext('2d'),
      l = layout(arena, w, h, large ? 12 : 4);
    c.fillStyle = '#17201c';
    c.fillRect(0, 0, w, h);
    c.fillStyle = arena.spec.ground;
    c.fillRect(l.left, l.top, l.width, l.height);
    c.fillStyle = '#18251de6';
    c.globalAlpha = 0.68;
    c.fillRect(l.left, l.top, l.width, l.height);
    c.globalAlpha = 1;
    function rect(r, color) {
      c.fillStyle = color;
      c.fillRect(w / 2 + r.x * l.scale, h / 2 + r.y * l.scale, r.w * l.scale, r.h * l.scale);
    }
    for (const r of arena.zones)
      rect(
        r,
        {
          asphalt: '#788076',
          trail: '#8e8a6c',
          ice: '#adcbcd',
          sand: '#ac946b',
          mud: '#695e48',
          gravel: '#978677',
          stubble: '#9b945c'
        }[r.type]
      );
    for (const r of arena.water) rect(r, '#477d88');
    for (const r of arena.walls) if (r.solid) rect(r, r.type === 'grove' ? '#577259' : arena.spec.ink);
    c.strokeStyle = '#c2cfb52b';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i <= 6; i++) {
      const x = l.left + (i * l.width) / 6;
      c.moveTo(x, l.top);
      c.lineTo(x, l.top + l.height);
    }
    for (let i = 0; i <= 4; i++) {
      const y = l.top + (i * l.height) / 4;
      c.moveTo(l.left, y);
      c.lineTo(l.left + l.width, y);
    }
    c.stroke();
    c.strokeStyle = '#afba9c';
    c.strokeRect(l.left, l.top, l.width, l.height);
    for (let i = 0; i < 2; i++) {
      const p = arena.bases[i],
        px = w / 2 + p.x * l.scale,
        py = h / 2 + p.y * l.scale,
        s = large ? 7 : 3;
      c.save();
      c.translate(px, py);
      c.rotate(Math.PI / 4);
      c.strokeStyle = i ? '#ffab8d' : '#8ee4d0';
      c.lineWidth = large ? 2 : 1;
      c.strokeRect(-s, -s, 2 * s, 2 * s);
      c.restore();
    }
    return l;
  }
  function initPicker() {
    const select = document.getElementById('map-select'),
      canvas = document.getElementById('map-plan');
    select.replaceChildren(...Object.entries(BattleMaps.specs).map(([id, s]) => new Option(s.name, id)));
    function refresh() {
      const arena = BattleMaps.create(select.value),
        s = arena.spec;
      document.getElementById('map-size').textContent = s.size.join(' × ') + ' м';
      document.getElementById('map-detail').textContent = s.detail;
      canvas.setAttribute('aria-label', 'План: ' + s.name + '. ' + s.detail);
      paint(canvas, arena, true);
    }
    select.addEventListener('change', refresh);
    refresh();
  }
  function drawHUD(canvas, c, g) {
    const a = g.arena,
      w = canvas.width,
      h = canvas.height;
    if (
      !cached ||
      cached.arena !== a ||
      cached.rev !== a.revision ||
      cached.img.width !== w ||
      cached.img.height !== h
    ) {
      const img = document.createElement('canvas');
      img.width = w;
      img.height = h;
      cached = { img, arena: a, rev: a.revision, layout: paint(img, a, false) };
    }
    c.drawImage(cached.img, 0, 0);
    const s = cached.layout.scale;
    for (const u of g.units) {
      if (u === g.player || u.dead || (u.team === 'enemy' && !u.visible)) continue;
      c.fillStyle = u.team === 'enemy' ? '#ff846f' : '#81e0ca';
      c.beginPath();
      c.arc(w / 2 + u.x * s, h / 2 + u.y * s, 2.25, 0, Math.PI * 2);
      c.fill();
    }
    const p = g.player;
    c.save();
    c.translate(w / 2 + p.x * s, h / 2 + p.y * s);
    c.rotate(p.angle);
    c.beginPath();
    c.moveTo(5.5, 0);
    c.lineTo(-3.6, 3.3);
    c.lineTo(-2.3, 0);
    c.lineTo(-3.6, -3.3);
    c.closePath();
    c.fillStyle = '#ffdf9d';
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = '#343020';
    c.stroke();
    // Short sight line and hull arrow are separate when driving across the view.
    c.rotate(p.tAngle - p.angle);
    c.strokeStyle = '#fff5cd';
    c.beginPath();
    c.moveTo(1, 0);
    c.lineTo(11, 0);
    c.stroke();
    c.restore();
  }
  return {
    initPicker,
    drawHUD,
    reset() {
      cached = null;
    }
  };
})();
