// js/tutorial.js
// ========== ИНТЕРАКТИВНОЕ ОБУЧЕНИЕ ==========
console.log('🎓 tutorial.js загружен');

var TUTORIAL_STEPS = [
  { id: 'move', text: '🕹️ <b>W/S</b> — разгон и реверс, <b>A/D</b> — корпус. <b>Пробел</b> — тормоз.', check: function () { return GameState.keys['KeyW'] || GameState.keys['KeyS'] || GameState.keys['KeyA'] || GameState.keys['KeyD']; } },
  { id: 'aim', text: '🎯 Наведите кольцо на цель мышью. Башня повернётся к цели, а камера останется за корпусом. Чтобы повернуть корпус, нажмите <b>A</b> или <b>D</b>.', check: function () { return true; }, timed: 2500 },
  { id: 'fire', text: '🔫 Зажмите <b>ЛКМ</b>, чтобы выстрелить.', check: function () { return GameState.player.lastShot > 0; } },
  { id: 'shell', text: '💣 Нажмите <b>1</b>, <b>2</b> или <b>3</b>, чтобы сменить тип снаряда.', check: function () { return GameState.curShell !== tutorialStartingShell; } },
  { id: 'cons', text: '🧰 Нажмите <b>4-9</b>, чтобы использовать расходник (например, аптечку).', check: function () { return GameState.consumables.some(Boolean); } },
  { id: 'kill', text: '💥 Уничтожьте тренировочный танк противника!' }
];

var tutorialStepIndex = 0;
var tutorialTimer = null;
var tutorialPollHandle = null;

var tutorialStartingShell = 0;

async function startTutorial() {
  tutorialStepIndex = 0;
  tutorialStartingShell = GameState.curShell;
  GameState.controlMode = 'pc';
  document.body.classList.remove('mobile-mode');
  if (!await startTraining()) return;

  var overlay = document.getElementById('tutorial-overlay');
  if (overlay) overlay.style.display = 'flex';
  showTutorialStep();

  tutorialPollHandle = setInterval(pollTutorialStep, 300);
}

function showTutorialStep() {
  var step = TUTORIAL_STEPS[tutorialStepIndex];
  var box = document.getElementById('tutorial-text');
  if (box) box.innerHTML = step.text;
  if (step.timed) {
    clearTimeout(tutorialTimer);
    tutorialTimer = setTimeout(nextTutorialStep, step.timed);
  }
}

function pollTutorialStep() {
  if (!GameState.gameActive) {
    // Бой завершён. Оставляем штатный экран результатов, не перекрывая его обучением.
    closeTutorial();
    return;
  }
  var step = TUTORIAL_STEPS[tutorialStepIndex];
  if (!step || step.timed) return;
  if (step.check && step.check()) nextTutorialStep();
}

function nextTutorialStep() {
  tutorialStepIndex = Math.min(tutorialStepIndex + 1, TUTORIAL_STEPS.length - 1);
  // Clips have only one ammunition type; do not strand the tutorial on key 2.
  if (TUTORIAL_STEPS[tutorialStepIndex].id === 'shell' && GameState.player?.usesMagazine) tutorialStepIndex++;
  showTutorialStep();
}

function closeTutorial() {
  clearInterval(tutorialPollHandle);
  clearTimeout(tutorialTimer);
  document.getElementById('tutorial-overlay').style.display = 'none';
  GameState.tutorialDone = true;
  saveProgress();
}

function skipTutorial() {
  closeTutorial();
  backToGarage();
}
