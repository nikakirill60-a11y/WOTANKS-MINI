// One snapshot for all three boards. No leaderboard request until the player opens it.
(() => {
  const el = id => document.getElementById(id);
  const dialog = el('leaderboard-modal'), table = el('standings-table');
  const picker = [...dialog.querySelectorAll('[data-board]')], refresh = el('standings-refresh');
  const fmt = new Intl.NumberFormat('ru-RU');
  const boards = {
    tanks: ['Танки', 'Свои машины в ангаре. Аренда и техника в очереди не считаются.'],
    wins: ['Победы', 'Все победы аккаунта с начала игры.'],
    gold: ['Золото, G', 'Текущий запас игрового золота, а не сумма всех начислений.']
  };
  let board = 'tanks', snapshot = [], updated = '', request = 0;

  function render() {
    const [unit, rule] = boards[board];
    for (const button of picker) button.setAttribute('aria-pressed', String(button.dataset.board === board));
    el('standings-rule').textContent = rule;
    el('standings-unit').textContent = unit;
    table.setAttribute('aria-label', 'Топ игроков: ' + unit);
    const body = table.tBodies[0];
    body.replaceChildren();
    for (const row of snapshot.filter(r => r.category === board)) {
      const tr = body.insertRow(), place = tr.insertCell();
      const badge = document.createElement('span');
      badge.className = 'standings-place'; badge.dataset.place = row.place;
      badge.textContent = fmt.format(row.place); place.append(badge);
      const nick = document.createElement('th'); nick.scope = 'row';
      nick.textContent = row.callsign; tr.append(nick);
      if (row.is_self) {
        tr.className = 'standings-self';
        const mark = document.createElement('small');
        mark.textContent = row.entry_no > 10 ? 'Вы · вне десятки' : 'Вы'; nick.append(' ', mark);
      }
      tr.insertCell().textContent = fmt.format(row.score);
    }
    table.hidden = !body.rows.length;
    dialog.querySelector('.standings-ties').hidden = table.hidden;
  }

  async function load() {
    const ticket = ++request, status = el('standings-status');
    const current = () => dialog.open && request === ticket;
    refresh.disabled = true; table.setAttribute('aria-busy', 'true');
    status.textContent = 'Загружаем рейтинги…';
    try {
      const rows = await Accounts.standings();
      if (!current()) return;
      if (!Array.isArray(rows) || !rows.every(r => r && Object.hasOwn(boards, r.category) &&
        typeof r.callsign === 'string' && Number.isSafeInteger(r.place) && Number.isSafeInteger(r.entry_no) &&
        Number.isSafeInteger(r.score) && typeof r.is_self === 'boolean')) throw Error('standings format');
      snapshot = rows.sort((a, b) => a.entry_no - b.entry_no);
      updated = new Date().toLocaleTimeString('ru-RU'); render();
      status.textContent = rows.length ? 'Обновлено в ' + updated : 'Пока нет зарегистрированных игроков.';
    } catch {
      if (!current()) return;
      status.textContent = updated ? `Не удалось обновить. Показаны данные на ${updated}.` :
        'Не удалось загрузить рейтинги. Проверьте подключение и нажмите «Обновить».';
    } finally {
      if (current()) { refresh.disabled = false; table.removeAttribute('aria-busy'); }
    }
  }

  for (const button of picker) button.addEventListener('click', () => { board = button.dataset.board; render(); });
  refresh.addEventListener('click', load);
  el('leaderboard-open').addEventListener('click', () => {
    if (dialog.open || GameState.gameActive || battleLaunch || Accounts.switching) return;
    // Never carry a previous account's personal row into a new visit.
    snapshot = []; updated = ''; render(); dialog.showModal(); load();
  });
})();
