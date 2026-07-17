// js/tutorial.js
// ========== ИНТЕРАКТИВНОЕ ОБУЧЕНИЕ ==========
console.log('🎓 tutorial.js загружен');

var TUTORIAL_STEPS = [
  { id: 'move', text: '🕹️ Используйте <b>W A S D</b>, чтобы двигать танк.', check: function () { return GameState.keys['KeyW'] || GameState.keys['KeyS'] || GameState.keys['KeyA'] || GameState.keys['KeyD']; } },
  { id: 'aim', text: '🎯 Наведите прицел на вражеский танк мышью.', check: function () { return true; }, timed: 2500 },
  { id: 'fire', text: '🔫 Зажмите <b>ЛКМ</b>, чтобы выстрелить.', check: function () { return GameState.tutorialShots > 0; } },
  { id: 'shell', text: '💣 Нажмите <b>1</b>, <b>2</b> или <b>3</b>, чтобы сменить тип снаряда.', check: function () { return GameState.tutorialShellSwitched; } },
  { id: 'cons', text: '🧰 Нажмите <b>4-9</b>, чтобы использовать расходник (например, аптечку).', check: function () { return GameState.tutorialConsUsed; } },
  { id: 'kill', text: '💥 Уничтожьте тренировочный танк противника!', check: function () { return GameState.tutorialEnemyKilled; } },
  { id: 'done', text: '🏆 Обучение пройдено! Возвращайтесь в ангар, чтобы начать настоящие бои.', check: function () { return true; }, final: true }
];

var tutorialStepIndex = 0;
var tutorialTimer = null;
var tutorialPollHandle = null;

function isTutorialActive() {
  return document.getElementById('tutorial-overlay') && document.getElementById('tutorial-overlay').style.display !== 'none';
}

function startTutorial() {
  GameState.tutorialShots = 0;
  GameState.tutorialShellSwitched = false;
  GameState.tutorialConsUsed = false;
  GameState.tutorialEnemyKilled = false;
  tutorialStepIndex = 0;

  patchTutorialHooks();
  document.getElementById('control-modal') && document.getElementById('control-modal').classList.remove('show');
  GameState.controlMode = 'pc';
  setupPCControls();
  startTraining();

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
  if (!GameState.gameActive) return;
  var step = TUTORIAL_STEPS[tutorialStepIndex];
  if (!step || step.timed) return;
  if (step.check && step.check()) nextTutorialStep();
}

function nextTutorialStep() {
  var step = TUTORIAL_STEPS[tutorialStepIndex];
  if (step && step.final) { finishTutorial(); return; }
  tutorialStepIndex = Math.min(tutorialStepIndex + 1, TUTORIAL_STEPS.length - 1);
  showTutorialStep();
}

function finishTutorial() {
  clearInterval(tutorialPollHandle);
  clearTimeout(tutorialTimer);
  GameState.tutorialDone = true;
  saveProgress();
  var overlay = document.getElementById('tutorial-overlay');
  if (overlay) overlay.style.display = 'none';
  backToGarage();
}

function skipTutorial() {
  GameState.tutorialDone = true;
  saveProgress();
  clearInterval(tutorialPollHandle);
  clearTimeout(tutorialTimer);
  var overlay = document.getElementById('tutorial-overlay');
  if (overlay) overlay.style.display = 'none';
  if (GameState.gameActive) backToGarage();
}

// ========== НЕИНВАЗИВНЫЕ ХУКИ (без правки controls.js/tank.js) ==========
var tutorialHooksPatched = false;
function patchTutorialHooks() {
  if (tutorialHooksPatched) return;
  tutorialHooksPatched = true;

  var origSetShell = window.setShell;
  if (typeof origSetShell === 'function') {
    window.setShell = function (i) { GameState.tutorialShellSwitched = true; return origSetShell(i); };
  }

  var origUseCons = window.useCons;
  if (typeof origUseCons === 'function') {
    window.useCons = function (i) { GameState.tutorialConsUsed = true; return origUseCons(i); };
  }

  if (window.Tank && Tank.prototype.fire) {
    var origFire = Tank.prototype.fire;
    Tank.prototype.fire = function () {
      if (this === GameState.player) GameState.tutorialShots = (GameState.tutorialShots || 0) + 1;
      return origFire.apply(this, arguments);
    };
  }

  var origEndBattle = window.endBattle;
  if (typeof origEndBattle === 'function') {
    window.endBattle = function (won) {
      if (isTutorialActive() && won) GameState.tutorialEnemyKilled = true;
      return origEndBattle(won);
    };
  }
}

window.startTutorial = startTutorial;
window.skipTutorial = skipTutorial;
window.isTutorialActive = isTutorialActive;
