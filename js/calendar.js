// December dates indicate actual visits; the two tanks count visits, not day-of-month.
function renderCalendar() {
  const dates = GameState.advent2026.dates, today = WinterSeason.dateKey(WinterSeason.now());
  document.getElementById('advent-count').textContent = `${dates.length} / 31`;
  document.getElementById('advent-status').textContent = today < '2026-12-01' ? 'Первый подарок откроется 1 декабря.' :
    today > '2026-12-31' ? 'Адвент завершён. Полученные награды остаются в ангаре.' :
    !dates.includes(today) ? 'Проверьте дату устройства. Уже отмеченные посещения сохранены.' :
    `Подарок за сегодня: ${rewardText(WinterSeason.reward(dates.indexOf(today)+1))}. Награда сохранена.`;
  document.getElementById('calendar-days').replaceChildren(...Array.from({length:31}, (_,i) => {
    const key = `2026-12-${String(i+1).padStart(2,'0')}`, got = dates.indexOf(key), cell = document.createElement('div');
    cell.className = 'advent-date ' + (got >= 0 ? 'received' : key < today ? 'missed' : 'future');
    const num = document.createElement('b'), status = document.createElement('small');
    num.textContent = String(i+1).padStart(2,'0');
    status.textContent = got >= 0 ? 'Получено' : key < today ? 'Пропуск' : 'Ожидает';
    if (key === today) cell.setAttribute('aria-current','date');
    cell.title = got >= 0 ? rewardText(WinterSeason.reward(got+1)) : `${i+1} декабря · ${status.textContent}`;
    cell.append(num,status); return cell;
  }));
  for (const [n,id] of [[15,'BT42'],[31,'TL7OLEN']]) {
    document.getElementById('milestone-'+n).textContent = dates.length >= n ? (GameState.pendingVehicles.includes(id) ? 'Получено · ожидает слота' : GameState.owned.includes(id) ? 'Получено · в ангаре' : 'Получено · продано') : `Ещё визитов: ${n-dates.length}`;
  }
}
function openCalendar() {
  WinterSeason.refresh(); renderCalendar(); document.getElementById('calendar-modal').showModal();
}
