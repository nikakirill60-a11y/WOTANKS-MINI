// js/features/weather-environments.js
// Погода и водные преграды.
console.log('🌦️ weather-environments.js загружается...');

const WeatherEngine = {
  currentWeather: 'clear', // clear, rain, snow, sandstorm, night
  waterBodies: [],

  // 26. ДИНАМИЧЕСКИЙ ВЫБОР ПОГОДЫ
  initWeatherForBattle(arena) {
    const list = arena.spec.weather;
    this.currentWeather = list[Math.floor(Math.random() * list.length)];
    this.waterBodies = arena.water;
  },

  // 30. ЗАТОПЛЕНИЕ В ВОДЕ (Drowning Timer)
  updateWaterPhysics(tank, dt) {
    if (!tank || tank.dead) return;
    let inWater = false;
    for (const w of this.waterBodies) {
      if (tank.x >= w.x && tank.x <= w.x + w.w && tank.y >= w.y && tank.y <= w.y + w.h) {
        inWater = true;
        break;
      }
    }
    if (inWater) {
      if (tank.drownTimer == null) tank.drownTimer = 10.0;
      tank.drownTimer -= dt;
      if (tank.drownTimer <= 0) {
        tank.hp = 0; // затонул
        tank.dead = true;
        snd('boom');
        updateScoreboard();
      }
    } else {
      tank.drownTimer = null;
    }
  }
};
