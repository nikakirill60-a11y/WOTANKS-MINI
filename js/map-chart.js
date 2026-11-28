// The hangar plan and HUD share the projection and actual colliders, not a separate
// illustration. Cache the static HUD layer until a building falls or the canvas resizes.
const MapChart = (() => {
  let cached = null;
  const surfaceInk = {
    asphalt: '#788076',
    trail: '#8e8a6c',
    ice: '#adcbcd',
    sand: '#ac946b',
    mud: '#695e48',
    gravel: '#978677',
    stubble: '#9b945c',
    cobble: '#b0a995',
    rail: '#514e46',
    runway: '#758485',
    timber: '#b39367',
    paving: '#827e72'
  };
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
    // The relief tint is baked only when the static plan changes. Its bands are
    // sampled from the same playable triangles, underneath roads and cover.
    const f = arena.ground;
    if (f.max > 0) {
      const topo = document.createElement('canvas');
      topo.width = f.cols;
      topo.height = f.rows;
      const ctx = topo.getContext('2d'),
        pixels = ctx.createImageData(f.cols, f.rows),
        out = pixels.data;
      for (let j = 0; j < f.rows; j++)
        for (let i = 0; i < f.cols; i++) {
          const k = j * (f.cols + 1) + i,
            d = (j * f.cols + i) * 4,
            h = f.value(k, 0.5, 0.5) / BATTLE_UNITS_PER_METRE;
          if (h <= 0) continue;
          const sun =
            (f.samples[k + 1] - f.samples[k]) / f.dx +
            (0.6 * (f.samples[k + f.cols + 1] - f.samples[k])) / f.dy;
          const band = Math.floor(h / 3) % 2;
          out[d] = 219;
          out[d + 1] = 214;
          out[d + 2] = 172;
          out[d + 3] = bounded(9 + (60 * h) / (f.max / BATTLE_UNITS_PER_METRE) + sun * 125 + band * 9, 0, 95);
        }
      ctx.putImageData(pixels, 0, 0);
      c.drawImage(topo, l.left, l.top, l.width, l.height);
    }
    // Contours cut the actual triangular height field. Only the fold-out sheet gets
    // fine cartography; the small, cached HUD stays clear for team markers.
    if(large){
      const stride=f.cols+1,m=BATTLE_UNITS_PER_METRE,level=6*m;
      c.strokeStyle='#ead8a543';c.lineWidth=.72;c.beginPath();
      const segment=(px,py,h,ax,ay,ha,bx,by,hb)=>{
        const lo=Math.min(h,ha,hb),hi=Math.max(h,ha,hb);
        for(let k=Math.max(level,Math.ceil(lo/level)*level);k<hi;k+=level){let seen=false;
          const edge=(x,y,z,X,Y,Z)=>{if((z>k)===(Z>k))return;const t=(k-z)/(Z-z);const dx=l.left+(x+t*(X-x))*f.dx*l.scale,dy=l.top+(y+t*(Y-y))*f.dy*l.scale;
            if(seen)c.lineTo(dx,dy);else c.moveTo(dx,dy);seen=true;};edge(px,py,h,ax,ay,ha);edge(ax,ay,ha,bx,by,hb);edge(bx,by,hb,px,py,h);
        }};
      for(let j=0;j<f.rows;j++)for(let i=0;i<f.cols;i++){const k=j*stride+i,h=f.samples[k],right=f.samples[k+1],bot=f.samples[k+stride];
        segment(i,j,h,i+1,j,right,i,j+1,bot);segment(i+1,j,right,i+1,j+1,f.samples[k+stride+1],i,j+1,bot);}
      c.stroke();
    }
    function rect(r, color) {
      c.fillStyle = color;
      c.fillRect(w / 2 + r.x * l.scale, h / 2 + r.y * l.scale, r.w * l.scale, r.h * l.scale);
    }
    if (large) {
      // Orchard rows and the edges of the tree belts, not decorative dots copied to every sector.
      c.fillStyle = arena.id === 'sawmill' ? '#c49b6b9e' : arena.id === 'frost' ? '#9bc1b49e' : '#8dac809e';
      for (const t of arena.trees) c.fillRect(w / 2 + t.x * l.scale - .7, h / 2 + t.y * l.scale - .7, 1.4, 1.4);
    }
    for (const r of arena.zones) rect(r, surfaceInk[r.type]);
    c.save();
    c.lineCap = c.lineJoin = 'round';
    for (const p of arena.paths) {
      c.strokeStyle = surfaceInk[p.type];
      c.lineWidth = Math.max(1, p.radius * 2 * l.scale);
      c.beginPath();
      p.points.forEach(({ x, y }, i) => c[i ? 'lineTo' : 'moveTo'](w / 2 + x * l.scale, h / 2 + y * l.scale));
      c.stroke();
    }
    c.restore();
    for (const r of arena.water) rect(r, '#477d88');
    for (const r of arena.walls) if (r.solid) rect(r, r.type === 'grove' ? '#577259' : arena.spec.ink);
    c.strokeStyle = '#c2cfb52b';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i <= BattleRecon.cols; i++) {
      const x = l.left + (i * l.width) / BattleRecon.cols;
      c.moveTo(x, l.top);
      c.lineTo(x, l.top + l.height);
    }
    for (let i = 0; i <= BattleRecon.rows; i++) {
      const y = l.top + (i * l.height) / BattleRecon.rows;
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
    if (large) {
      c.save();
      const margin=l.left,base=h-24,span=100*BATTLE_UNITS_PER_METRE*l.scale;
      c.font='bold 10px monospace';c.textAlign='center';c.fillStyle='#d8c39e';c.fillText('С',margin*.48,26);
      c.beginPath();c.moveTo(margin*.48,31);c.lineTo(margin*.48-5,51);c.lineTo(margin*.48,47);c.lineTo(margin*.48+5,51);c.closePath();c.fill();
      c.fillStyle='#afbaac';c.fillText('ЛИСТ',margin*.48,base-40);c.font='bold 19px monospace';c.fillStyle='#e2ca98';c.fillText(arena.spec.sector,margin*.48,base-20);
      c.fillRect(margin*.48-span/2,base-4,span,2);c.font='9px monospace';c.fillText('100 м',margin*.48,base+9);
      c.fillStyle = '#c3cabb';
      for (let i = 0; i < BattleRecon.cols; i++) c.fillText(String.fromCharCode(65 + i), l.left + (i + .5) * l.width / BattleRecon.cols, l.top - 3);
      for (let j = 0; j < BattleRecon.rows; j++) c.fillText(String(j + 1), l.left + l.width + 8, l.top + (j + .5) * l.height / BattleRecon.rows + 3);
      c.font = 'bold 11px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      arena.sights.forEach(({ x, y }, i) => {
        const px = w / 2 + x * l.scale,
          py = h / 2 + y * l.scale;
        c.beginPath();
        c.arc(px, py, 7, 0, 2 * Math.PI);
        c.fillStyle = '#28332e';
        c.fill();
        c.strokeStyle = '#ebcd88';
        c.lineWidth = 1.5;
        c.stroke();
        c.fillStyle = '#fff0c7';
        c.fillText(String(i + 1), px, py + 0.5);
      });
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
      AudioSystem.stopPreview();
      document.getElementById('map-vista').src='assets/sectors/'+arena.id+'.webp';
      document.getElementById('map-folio').textContent='АТЛАС  /  ЛИСТ '+s.sector;
      document.getElementById('map-chapter').textContent=s.chapter;
      document.getElementById('map-mood').textContent=s.mood;
      document.getElementById('map-size').textContent = s.size.join(' × ') + ' м';
      document.getElementById('map-detail').textContent = s.detail;
      document.getElementById('map-sights').replaceChildren(
        ...arena.sights.map(({ name, x, y }) => {
          const li = document.createElement('li');
          const col = Math.floor((x / arena.bounds.x + 1) * BattleRecon.cols / 2);
          const row = Math.floor((y / arena.bounds.y + 1) * BattleRecon.rows / 2);
          li.dataset.grid = String.fromCharCode(65 + col) + (row + 1);
          li.setAttribute('aria-label', name + ', клетка ' + li.dataset.grid);
          li.textContent = name;
          return li;
        })
      );
      canvas.setAttribute('aria-label', 'План: ' + s.name + ', ' + s.size.join(' × ') + ' м. ' + s.detail);
      paint(canvas, arena, true);
    }
    const listen=document.getElementById('map-listen');
    const listening=on=>{listen.setAttribute('aria-pressed',String(on));listen.textContent=on?'■ Остановить':'▷ Послушать · 4 с';};
    listening(false);
    listen.onclick=()=>{
      if(listen.getAttribute('aria-pressed')==='true')AudioSystem.stopPreview();
      else if(AudioSystem.preview(select.value,()=>listening(false))){listening(true);document.getElementById('map-mood').textContent=BattleMaps.specs[select.value].mood;}
      else document.getElementById('map-mood').textContent=GameState.settings.volume?'Звук недоступен':'Громкость выключена';
    };
    document.getElementById('sector-atlas').ontoggle=e=>{if(!e.currentTarget.open)AudioSystem.stopPreview();};
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
    const { scale: s, left, top, width, height } = cached.layout;
    const recon = g.navigation?.recon,
      label = document.getElementById('recon-status');
    label.hidden = !recon;
    if (recon) {
      const team = recon.teams[0],
        dw = width / BattleRecon.cols,
        dh = height / BattleRecon.rows;
      const text = `Разведано: ${team.count}/${recon.total}`;
      if (label.textContent !== text) label.textContent = text;
      c.fillStyle = '#09151378';
      for (let i = 0; i < team.visited.length; i++)
        if (recon.anchors[i] && team.visited[i] < 0)
          c.fillRect(left + (i % BattleRecon.cols) * dw, top + Math.floor(i / BattleRecon.cols) * dh, dw, dh);
    }
    const dot = g.units.length >= 20 && width < 140 ? 1.65 : 2.25;
    for (const u of g.units) {
      if (u === g.player || u.dead || (u.team === 'enemy' && !u.visible)) continue;
      c.fillStyle = u.team === 'enemy' ? '#ff846f' : '#81e0ca';
      c.beginPath();
      c.arc(w / 2 + u.x * s, h / 2 + u.y * s, dot, 0, Math.PI * 2);
      c.fill();
      if (u.team !== 'enemy' && u.bot?.scout) {
        c.strokeStyle = '#d6f8db';
        c.lineWidth = 1;
        c.beginPath();
        c.arc(w / 2 + u.x * s, h / 2 + u.y * s, dot + 1.2, 0, 2 * Math.PI);
        c.stroke();
      }
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
    const cursor = p.isSPG && BattleView.artillery;
    if (cursor) {
      const x = w / 2 + cursor.x * s,
        y = h / 2 + cursor.y * s;
      c.strokeStyle = '#ffe5ab';
      c.lineWidth = 1.4;
      c.strokeRect(x - 3.5, y - 3.5, 7, 7);
    }
  }
  // Inverse of the painted board, including its padding and the mobile CSS scale.
  function boardPoint(canvas, clientX, clientY) {
    const box = canvas.getBoundingClientRect(),
      l = layout(GameState.arena, canvas.width, canvas.height, 4);
    const x = ((clientX - box.left - canvas.clientLeft) * canvas.width) / canvas.clientWidth;
    const y = ((clientY - box.top - canvas.clientTop) * canvas.height) / canvas.clientHeight;
    return { x: (x - canvas.width / 2) / l.scale, y: (y - canvas.height / 2) / l.scale };
  }
  return {
    initPicker,
    boardPoint,
    drawHUD,
    reset() {
      cached = null;
    }
  };
})();
