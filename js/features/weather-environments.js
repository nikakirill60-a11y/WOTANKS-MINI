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
    this.ground = arena.ground;
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
    const h = tank._placed ? tank.rideHeight : (this.ground?.at(tank.x, tank.y) ?? 0);
    const deep = inWater && -h > (tank.modelAsset?.height ?? 2) * BATTLE_UNITS_PER_METRE * 0.62;
    tank.submersion = deep ? (tank.submersion || 0) + dt : Math.max(0, (tank.submersion || 0) - 2 * dt);
    tank.drownTimer = deep ? Math.max(0, 10 - tank.submersion) : null;
    if (deep && tank.submersion >= 10) {
      tank.hp = 0;
      tank.dead = true;
      snd('boom');
      updateScoreboard();
    }
  }
};
