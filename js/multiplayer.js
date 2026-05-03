// js/multiplayer.js
console.log('🌐 multiplayer.js загружен');

let currentRoomId = null;
let multiplayerMode = false;
let otherPlayers = {};
let positionSubscription = null;
let shotSubscription = null;
let isRoomHost = false;

// ========== ЭКРАН ЛОББИ ==========
function showWaitingScreen(roomCode, mode, players, isHost) {
  const overlay = document.createElement('div');
  overlay.id = 'waiting-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.95);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
  `;

  let playersHtml = players.map((p, i) => `
    <div style="padding: 10px; background: #222; margin: 5px 0; border-radius: 4px; display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">${i === 0 ? '👑' : '⚔️'}</span>
      <span style="color: ${i === 0 ? '#f1c40f' : '#2ecc71'}; font-weight: bold;">${p}</span>
      ${i === 0 ? '<span style="color: #888; font-size: 11px; margin-left: auto;">ХОСТ</span>' : ''}
    </div>
  `).join('');

  // ✅ ИСПРАВЛЕНО: mode * 2 (1x1 = 2 игрока, 2x2 = 4 игрока)
  const totalPlayers = mode * 2;

  // Добавляем пустые слоты
  for (let i = players.length; i < totalPlayers; i++) {
    playersHtml += `
      <div style="padding: 10px; background: #111; margin: 5px 0; border-radius: 4px; border: 1px dashed #444; text-align: center; color: #666;">
        <span>⏳ Ожидание игрока...</span>
      </div>
    `;
  }

  // ✅ ИСПРАВЛЕНО: проверка на totalPlayers
  const canStart = players.length >= totalPlayers;

  const startButton = isHost 
    ? `<button class="btn" style="background: #27ae60; font-size: 16px; font-weight: bold; margin-top: 20px; ${!canStart ? 'opacity: 0.5; cursor: not-allowed;' : ''}" onclick="hostStartBattle()" ${!canStart ? 'disabled' : ''}>
        🚀 НАЧАТЬ БОЙ ${canStart ? '' : `(${players.length}/${totalPlayers})`}
      </button>`
    : `<div style="margin-top: 20px; color: #f39c12; font-size: 14px;">
        ⏳ Ожидание решения хоста...
      </div>`;

  overlay.innerHTML = `
    <div style="text-align: center; color: #fff; max-width: 500px; width: 90%;">
      <h2 style="margin-bottom: 20px; color: #f1c40f;">🎮 ЛОББИ</h2>
      
      <div style="font-size: 16px; margin: 15px 0; padding: 15px; background: #222; border-radius: 8px;">
        <div style="margin-bottom: 10px;">Режим: <strong>${mode}x${mode}</strong></div>
        <div>Код комнаты: <span style="color: #f1c40f; font-weight: bold; font-size: 20px;">${roomCode}</span></div>
      </div>

      <div style="margin: 20px 0;">
        <h3 style="color: #3498db; margin-bottom: 10px;">ИГРОКИ (${players.length}/${totalPlayers})</h3>
        <div id="players-list" style="max-height: 300px; overflow-y: auto;">
          ${playersHtml}
        </div>
      </div>

      ${startButton}

      <button class="btn" style="background: #e74c3c; margin-top: 10px;" onclick="cancelMultiplayerSearch()">
        ✕ ПОКИНУТЬ ЛОББИ
      </button>
    </div>
  `;

  const existingOverlay = document.getElementById('waiting-overlay');
  if (existingOverlay) existingOverlay.remove();
  
  document.body.appendChild(overlay);
}

function updateLobbyPlayers(players, mode) {
  const playersListEl = document.getElementById('players-list');
  if (!playersListEl) return;

  const totalPlayers = mode * 2;

  let html = '';
  players.forEach((p, i) => {
    html += `
      <div style="padding: 10px; background: #222; margin: 5px 0; border-radius: 4px; display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">${i === 0 ? '👑' : '⚔️'}</span>
        <span style="color: ${i === 0 ? '#f1c40f' : '#2ecc71'}; font-weight: bold;">${p}</span>
        ${i === 0 ? '<span style="color: #888; font-size: 11px; margin-left: auto;">ХОСТ</span>' : ''}
      </div>
    `;
  });

  for (let i = players.length; i < totalPlayers; i++) {
    html += `
      <div style="padding: 10px; background: #111; margin: 5px 0; border-radius: 4px; border: 1px dashed #444; text-align: center; color: #666;">
        <span>⏳ Ожидание игрока...</span>
      </div>
    `;
  }

  playersListEl.innerHTML = html;

  // Обновляем кнопку НАЧАТЬ БОЙ
  const canStart = players.length >= totalPlayers;
  const startBtn = document.querySelector('button[onclick="hostStartBattle()"]');
  if (startBtn) {
    startBtn.disabled = !canStart;
    startBtn.style.opacity = canStart ? '1' : '0.5';
    startBtn.style.cursor = canStart ? 'pointer' : 'not-allowed';
    startBtn.innerHTML = `🚀 НАЧАТЬ БОЙ ${canStart ? '' : `(${players.length}/${totalPlayers})`}`;
  }
}

function cancelMultiplayerSearch() {
  const overlay = document.getElementById('waiting-overlay');
  if (overlay) overlay.remove();

  if (currentRoomId && supabaseClient) {
    if (isRoomHost) {
      // Хост удаляет комнату
      supabaseClient
        .from('battle_rooms')
        .delete()
        .eq('id', currentRoomId);
      console.log('👑 Хост удалил комнату');
    } else {
      // Игрок просто покидает
      supabaseClient
        .from('battle_rooms')
        .select('players')
        .eq('id', currentRoomId)
        .single()
        .then(({ data }) => {
          if (data) {
            const players = data.players.filter(p => p !== currentUser);
            supabaseClient
              .from('battle_rooms')
              .update({ players: players })
              .eq('id', currentRoomId);
            console.log('👤 Игрок покинул лобби');
          }
        });
    }
    
    currentRoomId = null;
    isRoomHost = false;
  }

  console.log('❌ Покинули лобби');
}

// ========== ХОСТ НАЧИНАЕТ БОЙ ==========
async function hostStartBattle() {
  if (!isRoomHost || !currentRoomId) {
    alert('❌ Только хост может начать бой!');
    return;
  }

  console.log('👑 Хост начинает бой!');

  try {
    // Проверяем количество игроков
    const { data: room } = await supabaseClient
      .from('battle_rooms')
      .select('players, mode')
      .eq('id', currentRoomId)
      .single();

    const totalPlayers = room.mode * 2;

    if (room.players.length < totalPlayers) {
      alert(`❌ Недостаточно игроков! Нужно: ${totalPlayers}, есть: ${room.players.length}`);
      return;
    }

    await supabaseClient
      .from('battle_rooms')
      .update({ status: 'playing' })
      .eq('id', currentRoomId);

    console.log('✅ Статус комнаты обновлён на playing');
  } catch (error) {
    console.error('❌ Ошибка запуска боя:', error);
    alert('Ошибка запуска боя');
  }
}

// ========== ПОИСК ИГРОКОВ ==========
async function startMultiplayerSearch(mode) {
  console.log(`🔍 Ищем игроков на режим ${mode}x${mode}...`);
  
  if (!supabaseClient || !supabaseClient.from) {
    alert('❌ Онлайн режим недоступен!\n\nДля работы мультиплеера настройте Supabase.');
    return;
  }
  
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    const { data, error } = await supabaseClient
      .from('battle_rooms')
      .insert([{
        room_code: roomCode,
        host_username: currentUser,
        mode: mode,
        players: [currentUser],
        status: 'waiting'
      }])
      .select()
      .single();

    if (error) throw error;

    currentRoomId = data.id;
    isRoomHost = true;
    
    console.log(`✅ Комната создана: ${roomCode}`);
    console.log(`✅ Room ID: ${currentRoomId}`);
    console.log(`👑 Вы хост!`);
    
    showWaitingScreen(roomCode, mode, [currentUser], true);
    subscribeToRoomChanges(currentRoomId, mode);

  } catch (error) {
    console.error('❌ Ошибка создания комнаты:', error);
    alert('Ошибка подключения к серверу: ' + error.message);
  }
}

async function subscribeToRoomChanges(roomId, mode) {
  if (!supabaseClient) {
    console.error('❌ supabaseClient не определён');
    return;
  }

  console.log(`📡 Подписываемся на изменения комнаты ${roomId}`);

  supabaseClient
    .channel(`room:${roomId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'battle_rooms',
      filter: `id=eq.${roomId}`
    }, (payload) => {
      const room = payload.new;
      const players = room.players || [];
      const totalPlayers = mode * 2;
      
      console.log(`👥 Игроков в комнате: ${players.length}/${totalPlayers}`);
      console.log(`📊 Статус: ${room.status}`);
      console.log(`👤 Игроки:`, players);

      // Обновляем список игроков в лобби
      updateLobbyPlayers(players, mode);

      // Если хост запустил бой
      if (room.status === 'playing') {
        console.log('✅ ХОСТ ЗАПУСТИЛ БОЙ!');
        const overlay = document.getElementById('waiting-overlay');
        if (overlay) overlay.remove();
        
        setTimeout(() => {
          startMultiplayerBattle(roomId, mode);
        }, 500);
      }
    })
    .subscribe((status) => {
      console.log('🔔 Статус подписки:', status);
    });
}

// ========== ПРИСОЕДИНЕНИЕ К КОМНАТЕ ==========
async function joinRoom(roomCode) {
  console.log(`📌 Присоединяемся к комнате: ${roomCode}`);

  if (!supabaseClient) {
    alert('❌ Supabase не подключен');
    return;
  }

  try {
    const { data: rooms, error } = await supabaseClient
      .from('battle_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (error) throw new Error('Комната не найдена!');

    const room = rooms;
    const players = room.players || [];
    const totalPlayers = room.mode * 2;

    if (room.status !== 'waiting') {
      throw new Error('Бой уже начался!');
    }

    if (players.includes(currentUser)) {
      throw new Error('Вы уже в этой комнате!');
    }

    if (players.length >= totalPlayers) {
      throw new Error('Комната полная!');
    }

    players.push(currentUser);

    console.log(`📤 Обновляем комнату: ${players.length} игроков`);

    await supabaseClient
      .from('battle_rooms')
      .update({ 
        players: players
      })
      .eq('id', room.id);

    currentRoomId = room.id;
    isRoomHost = false;
    
    console.log('✅ Присоединились к комнате');

    showWaitingScreen(roomCode, room.mode, players, false);
    subscribeToRoomChanges(room.id, room.mode);

  } catch (error) {
    console.error('❌ Ошибка подключения:', error);
    alert('Ошибка: ' + error.message);
  }
}

// ========== БОЙ ==========
async function startMultiplayerBattle(roomId, mode) {
  console.log('⚔️⚔️⚔️ ЗАПУСКАЕМ МУЛЬТИПЛЕЕР БОЙ!');
  console.log('Room ID:', roomId);
  console.log('Mode:', mode);
  
  multiplayerMode = true;
  GameState.pendingBattle = mode * 2; // ✅ ИСПРАВЛЕНО: 1x1 = 2, 2x2 = 4
  
  // Показываем экран выбора управления
  document.getElementById('control-modal').classList.add('show');
}

// ========== СИНХРОНИЗАЦИЯ ==========
async function syncPlayerPositions(roomId) {
  if (!multiplayerMode || !GameState.player || !supabaseClient) return;

  try {
    await supabaseClient
      .from('battle_players')
      .upsert({
        room_id: roomId,
        username: currentUser,
        tank_id: GameState.selected,
        hp: GameState.player.hp,
        max_hp: GameState.player.maxHp,
        x: GameState.player.x,
        y: GameState.player.y,
        angle: GameState.player.angle,
        turret_angle: GameState.player.tAngle,
        is_alive: !GameState.player.dead,
        track_broken: GameState.player.trackBroken || false,
        on_fire: GameState.player.onFire || false
      }, { onConflict: 'room_id,username' });

    if (!positionSubscription) {
      positionSubscription = supabaseClient
        .channel(`positions:${roomId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'battle_players',
          filter: `room_id=eq.${roomId}`
        }, (payload) => {
          const pos = payload.new;
          if (pos.username !== currentUser) {
            updateOtherPlayer(pos);
          }
        })
        .subscribe();
    }

    if (multiplayerMode) {
      setTimeout(() => syncPlayerPositions(roomId), 100);
    }
  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error);
  }
}

function updateOtherPlayer(posData) {
  if (!otherPlayers[posData.username]) {
    otherPlayers[posData.username] = new Tank(
      posData.tank_id || 'T26',
      posData.x,
      posData.y,
      'enemy'
    );
    GameState.units.push(otherPlayers[posData.username]);
    console.log('👤 Добавлен игрок:', posData.username);
  }

  const player = otherPlayers[posData.username];
  player.x = posData.x;
  player.y = posData.y;
  player.angle = posData.angle;
  player.tAngle = posData.turret_angle;
  player.hp = Math.max(0, posData.hp);
  player.dead = !posData.is_alive;
  player.trackBroken = posData.track_broken;
  player.onFire = posData.on_fire;
}

async function syncPlayerShots(roomId) {
  if (!multiplayerMode || !supabaseClient) return;

  if (!shotSubscription) {
    shotSubscription = supabaseClient
      .channel(`shots:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'player_shots',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const shot = payload.new;
        if (shot.username !== currentUser) {
          GameState.bullets.push({
            x: shot.x,
            y: shot.y,
            a: shot.angle,
            team: 'enemy',
            dmg: 50,
            speed: 12,
            color: '#ff8800',
            st: shot.shell_type,
            shooter: { name: shot.username }
          });
          snd('shot');
        }
      })
      .subscribe();
  }
}

function endMultiplayerBattle() {
  multiplayerMode = false;

  if (positionSubscription) {
    positionSubscription.unsubscribe();
    positionSubscription = null;
  }

  if (shotSubscription) {
    shotSubscription.unsubscribe();
    shotSubscription = null;
  }

  otherPlayers = {};
  
  if (currentRoomId && supabaseClient) {
    supabaseClient
      .from('battle_rooms')
      .update({ status: 'finished' })
      .eq('id', currentRoomId);
    
    currentRoomId = null;
    isRoomHost = false;
  }

  console.log('❌ Мультиплеер окончен');
}

console.log('🌐 multiplayer.js полностью загружен');