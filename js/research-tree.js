// The original research interaction: a node per vehicle, a line from its
// prerequisite, and one click to research/select. A locked node is read-only.
let treeCardId = null,
  lastTreeSelection = null;
const treeEl = (id) => document.getElementById(id);
const xpLabel = (n) => n.toLocaleString('ru-RU') + ' XP';

function researchState(id) {
  const t = DB[id],
    parent = researchParent(id);
  if (GameState.owned.includes(id))
    return { kind: 'owned', text: id === GameState.selected ? 'Выбран для боя' : 'В ангаре' };
  if (parent && !GameState.owned.includes(parent))
    return { kind: 'locked', text: 'Сначала исследуйте ' + DB[parent].n };
  if (t.xp === 0)
    return { kind: 'available', text: 'Стартовая машина · нажмите узел, чтобы получить бесплатно' };
  if (GameState.XP < t.xp) return { kind: 'locked', text: 'Не хватает ' + xpLabel(t.xp - GameState.XP) };
  return { kind: 'available', text: 'Доступно исследование за ' + xpLabel(t.xp) };
}

function showTreeCard(id) {
  treeCardId = id;
  const t = DB[id];
  const photo = treeEl('tree-photo'),
    src = 'models/' + t.thumbnail;
  if (photo.getAttribute('src') !== src) photo.src = src;
  treeEl('tree-tier').textContent = CONFIG.TIER_ROMAN[t.tier] + ' · ' + CONFIG.TANK_CLASSES[t.cls];
  treeEl('tree-name').textContent = t.n;
  treeEl('tree-status').textContent = researchState(id).text;
  const stats = [
    ['Прочность', t.hp + ' HP'],
    [damageLabel(t), damageSummary(t)],
    [t.mag ? 'Полная перезарядка' : 'Перезарядка', (t.reload / 1000).toLocaleString('ru-RU') + ' с'],
    ['Пробитие', t.pen + ' мм'],
    ['Лоб корпуса / башни', armorLabel(t) + ' мм'],
    ['Скорость', speedLabel(t) + ' км/ч']
  ];
  if (t.yawLimits) {
    const [right, left] = t.yawLimits;
    stats.push([
      'Поворот орудия',
      !left && !right
        ? 'Вместе с корпусом'
        : left === -right
          ? `±${left}° от корпуса`
          : `${left}° влево · ${-right}° вправо`
    ]);
  }
  treeEl('tree-stats').replaceChildren(
    ...stats.map(([label, value]) => {
      const cell = document.createElement('div'),
        dt = document.createElement('dt'),
        dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      cell.append(dt, dd);
      return cell;
    })
  );
}

function researchTank(id) {
  if (!Object.hasOwn(DB, id)) return;
  const state = researchState(id);
  showTreeCard(id);
  if (state.kind === 'locked') return;
  if (state.kind === 'available') {
    GameState.XP -= DB[id].xp;
    GameState.owned.push(id);
  }
  GameState.selected = id;
  saveProgress();
  renderCarousel();
  updateResources();
}

function revealTreeNode() {
  const scroller = treeEl('tree-container'),
    node = treeEl('nodes').querySelector(`[data-tank-id="${treeCardId || GameState.selected}"]`);
  if (node) scroller.scrollLeft = node.offsetLeft - (scroller.clientWidth - node.offsetWidth) / 2;
  updateTreeNav();
}
function updateTreeNav() {
  const el = treeEl('tree-container');
  treeEl('tree-prev').disabled = el.scrollLeft < 1;
  treeEl('tree-next').disabled = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
}

function renderTree() {
  renderNatButtons();
  const container = treeEl('tree-container'),
    nodes = treeEl('nodes'),
    canvas = treeEl('tree-canvas');
  const branch = BRANCHES[GameState.curNat],
    line = branch.tanks;
  treeEl('branch-number').textContent = branch.number;
  treeEl('branch-title').textContent = branch.title;
  const height = 84,
    gap = 36,
    inset = 22,
    firstRow = 36,
    rowStep = height + 18,
    mapHeight = firstRow + (Math.max(2, branch.routes.length) - 1) * rowStep + height + 17;
  container.style.setProperty('--tree-height', mapHeight + 9 + 'px');
  const ctx = canvas.getContext('2d');
  ctx.font = getComputedStyle(nodes).getPropertyValue('--node-name-font').trim();
  // Long tier VIII–X names should not push tier II off a small phone screen.
  const columns = branch.routes[0].map((t) => ({
    width: Math.max(
      137,
      ...line.filter((v) => v.tier === t.tier).map((v) => Math.ceil(ctx.measureText(v.n).width) + 20)
    )
  }));
  let nextX = inset;
  for (const col of columns) {
    col.x = nextX;
    nextX += col.width + gap;
  }
  const mapWidth = nextX - gap + inset;
  const map = treeEl('tree-map');
  map.style.width = mapWidth + 'px';
  map.style.height = mapHeight + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(mapWidth * dpr);
  canvas.height = Math.round(mapHeight * dpr);
  canvas.style.width = mapWidth + 'px';
  canvas.style.height = mapHeight + 'px';
  ctx.scale(dpr, dpr);
  // Routes sharing a prefix are adjacent in the catalogue. Draw each shared
  // node once, centred over the lanes that descend from it, including later forks.
  const pos = new Map();
  for (const t of line) {
    const lanes = branch.routes.flatMap((route, i) => (route[t.tier - 1] === t ? [i] : []));
    const y = branch.routes.length === 1
      ? ({ lt: 112, mt: 87, ht: 62 }[t.cls] ?? 87)
      : firstRow + (lanes[0] + lanes.at(-1)) * rowStep / 2;
    pos.set(t.id, { ...columns[t.tier - 1], y });
  }
  ctx.font = '11px Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#acb6ab';
  columns.forEach(({ x, width }, i) => ctx.fillText(CONFIG.TIER_ROMAN[i + 1], x + width / 2, 24));
  const focused = nodes.contains(document.activeElement) && document.activeElement.dataset.tankId;
  const buttons = line.map((t) => {
    const { id } = t,
      { x, y, width } = pos.get(id),
      state = researchState(id),
      selected = GameState.selected === id;
    const parent = pos.get(researchParent(id));
    if (parent) {
      ctx.strokeStyle =
        state.kind === 'owned' ? '#87ac82' : state.kind === 'available' ? '#c8b181' : '#66726a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(parent.x + parent.width, parent.y + height / 2);
      ctx.lineTo(x, y + height / 2);
      ctx.stroke();
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `node ${state.kind}${selected ? ' selected' : ''}`;
    button.dataset.tankId = id;
    Object.assign(button.style, {
      left: x + 'px',
      top: y + 'px',
      width: width + 'px',
      height: height + 'px'
    });
    const action =
      state.kind === 'owned' ? 'Выбрать' : state.kind === 'available' ? 'Исследовать' : 'Характеристики';
    button.setAttribute('aria-label', action + ': ' + t.n);
    button.setAttribute('aria-pressed', String(selected));
    button.title = t.n + ' · ' + state.text;
    button.setAttribute('aria-description', state.text);
    const tag = document.createElement('small'),
      name = document.createElement('b'),
      price = document.createElement('span');
    tag.textContent = CONFIG.TIER_ROMAN[t.tier] + ' / ' + CONFIG.TANK_CLASSES[t.cls];
    name.textContent = t.n;
    price.textContent = selected
      ? '✓ Для боя'
      : state.kind === 'owned'
        ? 'В ангаре'
        : t.xp
          ? xpLabel(t.xp)
          : 'Бесплатно';
    const img = document.createElement('img');
    img.src = 'models/' + t.thumbnail;
    img.alt = '';
    img.className = 'node-tank';
    img.draggable = false;
    button.append(tag, img, name, price);
    button.onfocus = () => showTreeCard(id);
    button.onpointerenter = (e) => {
      if (e.pointerType === 'mouse') showTreeCard(id);
    };
    button.onclick = () => researchTank(id);
    return button;
  });
  nodes.replaceChildren(...buttons);
  // Browsing a nation does not equip its tank. A branch always opens on a card belonging to it.
  if (DB[treeCardId]?.nat !== GameState.curNat || lastTreeSelection !== GameState.selected) {
    treeCardId =
      DB[GameState.selected].nat === GameState.curNat
        ? GameState.selected
        : line.filter((t) => GameState.owned.includes(t.id)).sort((a, b) => b.tier - a.tier)[0]?.id ||
          line[0].id;
  }
  lastTreeSelection = GameState.selected;
  showTreeCard(treeCardId || GameState.selected);
  if (focused) buttons.find((b) => b.dataset.tankId === focused)?.focus({ preventScroll: true });
  container.onscroll = updateTreeNav;
  for (const [key, sign] of [
    ['prev', -1],
    ['next', 1]
  ])
    treeEl('tree-' + key).onclick = () => {
      container.scrollBy({
        left: sign * Math.max(columns[0].width + gap, container.clientWidth - columns[0].width - gap),
        behavior: 'instant'
      });
      updateTreeNav();
    };
  updateTreeNav();
}
window.addEventListener('resize', () => {
  if (!treeEl('bay-research').hidden) revealTreeNode();
});
