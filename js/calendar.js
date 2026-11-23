// The standalone calendar is not tied to missions or battle rewards.
function calendarReward(day) {
  if (day === 7) return { gold: 500, silver: 50000, charges: 2 };
  if (day === 14) return { gold: 1000, silver: 100000 };
  if (day === 21) return { gold: 1500, silver: 250000, charges: 5 };
  if (day === 28 || day === 30) return { gold: 3000, silver: 500000 };
  return { gold: 50, silver: 10000, xp: 1000 };
}
function openCalendar() {
  const dialog = document.getElementById('calendar-modal');
  const days = document.getElementById('calendar-days');
  days.replaceChildren();
  for (let day = 1; day <= 30; day++) {
    const button = document.createElement('button'),
      reward = calendarReward(day);
    button.className = 'calendar-day';
    const label = document.createElement('strong');
    label.textContent = 'День ' + day;
    const info = document.createElement('small');
    info.textContent = [
      reward.gold + ' G',
      reward.silver.toLocaleString('ru-RU') + ' ₽',
      reward.xp && reward.xp + ' XP',
      reward.charges && reward.charges + ' ⚡'
    ]
      .filter(Boolean)
      .join(' · ');
    button.disabled = GameState.loginCalendar.claimedDays.includes(day);
    const state = document.createElement('span');
    state.textContent = button.disabled ? 'Получено' : 'Забрать';
    button.append(label, info, state);
    button.onclick = () => {
      if (GameState.loginCalendar.claimedDays.includes(day)) return;
      GameState.loginCalendar.claimedDays.push(day);
      GameState.GOLD += reward.gold;
      GameState.SILVER += reward.silver;
      GameState.XP += reward.xp || 0;
      GameState.charges += reward.charges || 0;
      updateResources();
      saveProgress();
      openCalendar();
    };
    days.append(button);
  }
  if (!dialog.open) dialog.showModal();
}
