// Training shares the same captured mouse / multi-touch controller as a normal match.
const TUTORIAL_STEPS = [
  {
    id: 'move',
    pc: 'W/S или ↑/↓ — ход, A/D или ←/→ — поворот корпуса. Пробел — тормоз.',
    touch: 'Коснитесь поля слева и потяните палец: вверх и вниз — ход, в стороны — поворот корпуса.',
    check: () => GameState.player.isMoving || Math.abs(GameState.player.yawRate) > 0
  },
  {
    id: 'aim',
    pc: 'Совместите крест с целью мышью. Кольцо ствола догонит крест. ПКМ — свободный обзор, Shift — оптика.',
    touch:
      'Другим пальцем поверните обзор. Совместите крест с целью и дождитесь кольца ствола. «Прицел» включает оптику.',
    timed: 4000
  },
  {
    id: 'fire',
    pc: 'Нажмите ЛКМ, чтобы выстрелить. Кнопку можно удерживать.',
    touch: 'Нажмите «Огонь». Кнопку можно удерживать и вести пальцем для наведения.',
    check: () => GameState.player.lastShot > 0
  },
  {
    id: 'shell',
    pc: 'Нажмите 1, 2 или 3, чтобы сменить снаряд.',
    touch: 'Выберите другой снаряд над кнопкой огня.',
    check: () => GameState.curShell !== tutorialStartingShell
  },
  {
    id: 'cons',
    pc: 'Нажмите 4 для аптечки или Q для ремкомплекта.',
    touch: 'Нажмите «АПТ» для аптечки или «РЕМ» для ремонта.',
    check: () => GameState.consumables.some(Boolean)
  },
  { id: 'kill', pc: 'Уничтожьте тренировочный танк противника!' }
];
let tutorialStepIndex = 0,
  tutorialSince = 0,
  tutorialPollHandle = null,
  tutorialStartingShell = 0;
async function startTutorial() {
  if (GameState.gameActive || battleLaunch) return;
  const touch = matchMedia('(pointer: coarse)').matches;
  GameState.controlMode = touch ? 'mobile' : 'pc';
  document.body.classList.toggle('mobile-mode', touch);
  if (!(await startTraining())) return;
  tutorialStepIndex = 0;
  tutorialStartingShell = GameState.curShell;
  document.body.classList.add('in-tutorial');
  document.getElementById('tutorial-overlay').style.display = 'flex';
  showTutorialStep();
  tutorialPollHandle = setInterval(pollTutorialStep, 200);
}
function showTutorialStep() {
  const step = TUTORIAL_STEPS[tutorialStepIndex];
  tutorialSince = BattleClock.now();
  document.getElementById('tutorial-text').textContent =
    (GameState.controlMode === 'mobile' && step.touch) || step.pc;
}
function pollTutorialStep() {
  if (!GameState.gameActive) {
    closeTutorial();
    return;
  }
  if (!BattleInput.running) return;
  const step = TUTORIAL_STEPS[tutorialStepIndex];
  if (step.timed ? BattleClock.now() - tutorialSince < step.timed : !step.check?.()) return;
  tutorialStepIndex++;
  if (TUTORIAL_STEPS[tutorialStepIndex].id === 'shell' && GameState.player.usesMagazine) tutorialStepIndex++;
  showTutorialStep();
}
function closeTutorial() {
  clearInterval(tutorialPollHandle);
  tutorialPollHandle = null;
  document.body.classList.remove('in-tutorial');
  document.getElementById('tutorial-overlay').style.display = 'none';
  GameState.tutorialDone = true;
  saveProgress();
}
function skipTutorial() {
  closeTutorial();
  backToGarage();
}
