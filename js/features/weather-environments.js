// js/features/weather-environments.js
// 🌧️ Погодные условия, водные преграды, кусты маскировки, базы захвата, секторы миникарты
console.log('🌦️ weather-environments.js загружается...');

const WeatherEngine = {
  currentWeather: 'clear', // clear, rain, snow, sandstorm, night
  weatherParticles: [],
  captureBases: [],
  waterBodies: [],

  // 26. ДИНАМИЧЕСКИЙ ВЫБОР ПОГОДЫ
  initWeatherForBattle(mapType) {
    const list = ['clear', 'rain', 'night'];
    if (mapType === 'field') list.push('rain', 'snow');
    if (mapType === 'desert') list.push('sandstorm', 'clear');
    this.currentWeather = list[Math.floor(Math.random() * list.length)];
    this.weatherParticles = [];

    // Инициализация частиц погоды
    const pCount = this.currentWeather === 'rain' ? 120 : (this.currentWeather === 'snow' ? 90 : (this.currentWeather === 'sandstorm' ? 80 : 0));
    for (let i = 0; i < pCount; i++) {
      this.weatherParticles.push({
        x: Math.random() * 2500 - 1250,
        y: Math.random() * 2500 - 1250,
        speed: 15 + Math.random() * 10,
        size: 2 + Math.random() * 3
      });
    }

    // 30 & 35. ВОДНЫЕ ЗОНЫ И БАЗЫ ЗАХВАТА
    this.waterBodies = [
      { x: 300, y: -200, w: 250, h: 400, deep: true }
    ];

    this.captureBases = [
      { id: 1, name: 'База I', x: 0, y: 0, radius: 120, progress: 0, capturingTeam: null }
    ];
  },

  // 30. ЗАТОПЛЕНИЕ В ВОДЕ (Drowning Timer)
  updateWaterPhysics(tank, dt) {
    if (!tank) return;
    let inWater = false;
    for (const w of this.waterBodies) {
      if (tank.x >= w.x && tank.x <= w.x + w.w && tank.y >= w.y && tank.y <= w.y + w.h) {
        inWater = true;
        break;
      }
    }
    if (inWater) {
      tank.speedMul = 0.55; // замедление
      if (!tank.drownTimer) tank.drownTimer = 10.0;
      tank.drownTimer -= dt;
      if (tank.drownTimer <= 0) {
        tank.hp = 0; // затонул
        if (typeof snd === 'function') snd('explosion');
      }
    } else {
      tank.drownTimer = 10.0;
    }
  },

  // 32. МАСКИРОВКА В КУСТАХ
  getBushCamouflageBonus(tank, bushes) {
    if (!tank || !bushes) return 0;
    for (const b of bushes) {
      const dist = Math.hypot(b.x - tank.x, b.y - tank.y);
      if (dist < (b.w || 35)) {
        return 0.35; // +35% к маскировке
      }
    }
    return 0;
  },

  // 35. ЗАХВАТ БАЗЫ
  updateCaptureBases(units, dt) {
    for (const base of this.captureBases) {
      let teamUnits = { player: 0, enemy: 0 };
      units.forEach(u => {
        if (Math.hypot(u.x - base.x, u.y - base.y) <= base.radius && u.hp > 0) {
          if (u.type === 'player' || u.type === 'ally') teamUnits.player++;
          else teamUnits.enemy++;
        }
      });

      if (teamUnits.player > 0 && teamUnits.enemy === 0) {
        base.capturingTeam = 'player';
        base.progress = Math.min(100, base.progress + dt * 15);
      } else if (teamUnits.enemy > 0 && teamUnits.player === 0) {
        base.capturingTeam = 'enemy';
        base.progress = Math.min(100, base.progress + dt * 15);
      } else if (teamUnits.player === 0 && teamUnits.enemy === 0) {
        base.progress = Math.max(0, base.progress - dt * 5);
      }
    }
  },

  update(dt) {
    this.weatherParticles.forEach(p => {
      if (this.currentWeather === 'rain') {
        p.y += p.speed * 2.5;
        p.x -= p.speed * 0.4;
      } else if (this.currentWeather === 'snow') {
        p.y += p.speed * 0.8;
        p.x += Math.sin(p.y * 0.05) * 1.5;
      } else if (this.currentWeather === 'sandstorm') {
        p.x += p.speed * 2.8;
        p.y += Math.cos(p.x * 0.05) * 1.0;
      }
      if (p.y > 1500) p.y = -1500;
      if (p.x > 1500) p.x = -1500;
      if (p.x < -1500) p.x = 1500;
    });
  },

  draw(ctx, camX, camY, canvasWidth, canvasHeight) {
    // 30. Отрисовка воды
    this.waterBodies.forEach(w => {
      const sx = w.x - camX, sy = w.y - camY;
      ctx.fillStyle = 'rgba(28, 110, 164, 0.65)';
      ctx.fillRect(sx, sy, w.w, w.h);
      ctx.strokeStyle = '#2980b9';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, w.w, w.h);
    });

    // 35. Отрисовка базы
    this.captureBases.forEach(base => {
      const sx = base.x - camX, sy = base.y - camY;
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = base.capturingTeam === 'player' ? '#00e5ff' : (base.capturingTeam === 'enemy' ? '#ff3300' : '#ffffff');
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(sx, sy, base.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Прогресс бар базы
      if (base.progress > 0) {
        ctx.fillStyle = base.capturingTeam === 'player' ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 51, 0, 0.25)';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, base.radius, 0, (Math.PI * 2) * (base.progress / 100));
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🚩 ${base.name} (${Math.round(base.progress)}%)`, sx, sy - base.radius - 8);
      ctx.restore();
    });

    // 26-29. Отрисовка погоды
    if (this.currentWeather === 'night') {
      ctx.fillStyle = 'rgba(5, 10, 25, 0.45)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else if (this.currentWeather === 'rain') {
      ctx.strokeStyle = 'rgba(180, 210, 255, 0.55)';
      ctx.lineWidth = 1.5;
      this.weatherParticles.forEach(p => {
        const sx = p.x - camX, sy = p.y - camY;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 4, sy + 14);
        ctx.stroke();
      });
    } else if (this.currentWeather === 'snow') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.weatherParticles.forEach(p => {
        const sx = p.x - camX, sy = p.y - camY;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (this.currentWeather === 'sandstorm') {
      ctx.fillStyle = 'rgba(218, 165, 32, 0.22)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  }
};

window.WeatherEngine = WeatherEngine;
console.log('✅ weather-environments.js полностью готов');
