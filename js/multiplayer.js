// js/multiplayer.js
console.log('🌐 multiplayer.js загружен');

let positionSubscription = null;
let shotSubscription = null;
let isRoomHost = false;
let pollingInterval = null;

// ========== ЭКРАН ЛОББИ ==========
function showWaitingScreen(roomCode, mode, players, isHost) {
  const overlay = document.getElementById('waiting-overlay');
  if (overlay) overlay.remove();

  const newOverlay = document.createElement('div');
  newOverlay.id = 'waiting-overlay';
  newOverlay.style.cssText = `
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

  const totalPlayers = mode * 2;

  for (let i = players.length; i < totalPlayers; i++) {
    playersHtml += `
      <div style="padding: 10px; background: #111; margin: 5px 0; border-radius: 4px; border: 1px dashed #444; text-align: center; color: #666;">
        <span>⏳ Ожидание игрока...</span>
      </div>
    `;
  }

  const canStart = players.length >= totalPlayers;

  const startButton = isHost 
    ? `<button class="btn" style="background: #27ae60; font-size: 16px; font-weight: bold; margin-top: 20px; ${!canStart ? 'opacity: 0.5; cursor: not-allowed;' : ''}" onclick="hostStartBattle()" ${!canStart ? 'disabled' : ''}>
        🚀 НАЧАТЬ БОЙ ${canStart ? '' : `(${players.length}/${totalPlayers})`}
      </button>`
    : `<div style="margin-top: 20px; color: #f39c12; font-size: 14px;">⏳ Ожидание решения хоста...</div>`;

  newOverlay.innerHTML = `
    <div style="text-align: center; color: #fff; max-width: 500px; width: 90%;">
      <h2 style="margin-bottom: 20px; color: #f1c40f;">🎮 ЛОББИ</h2>
      <div style="font-size: 16px; margin: 15px 0; padding: 15px; background: #222; border-radius: 8px;">
        <div style="margin-bottom: 10px;">Режим: <strong>${mode}x${mode}</strong></div>
        <div>Код комнаты: <span style="color: #f1c40f; font-weight: bold; font-size: 20px;">${roomCode}</span></div>
      </div>
      <div style="margin: 20px 0;">
        <h3 style="color: #3498db; margin-bottom: 10px;">ИГРОКИ (${players.length}/${totalPlayers})</h3>
        <div id="players-list" style="max-height: 300px; overflow-y: auto;">${playersHtml}</div>
      </div>
      ${startButton}
      <button class="btn" style="background: #e74c3c; margin-top: 10px;" onclick="cancelMultiplayerSearch()">✕ ПОКИНУТЬ ЛОББИ</button>
    </div>
  `;

  document.body.appendChild(newOverlay);
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
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  const overlay = document.getElementById('waiting-overlay');
  if (overlay) overlay.remove();

  if (GameState.currentRoomId && supabaseClient) {
    if (isRoomHost) {
      supabaseClient.from('battle_rooms').delete().eq('id', GameState.currentRoomId);
      console.log('👑 Хост удалил комнату');
    } else {
      supabaseClient
        .from('battle_rooms')
        .select('players')
        .eq('id', GameState.currentRoomId)
        .single()
        .then(({ data }) => {
          if (data) {
            const players = data.players.filter(p => p !== currentUser);
            supabaseClient.from('battle_rooms').update({ players: players }).eq('id', GameState.currentRoomId);
          }
        });
    }
    
    GameState.currentRoomId = null;
    isRoomHost = false;
    GameState.multiplayerMode = false;
  }

  console.log('❌ Покинули лобби');
}

// ========== ХОСТ НАЧИНАЕТ БОЙ ==========
async function hostStartBattle() {
  if (!isRoomHost || !GameState.currentRoomId) {
    alert('❌ Только хост может начать бой!');
    return;
  }

  console.log('👑 Хост начинает бой!');

  try {
    const { data: room } = await supabaseClient
      .from('battle_rooms')
      .select('players, mode')
      .eq('id', GameState.currentRoomId)
      .single();

    const totalPlayers = room.mode * 2;

    if (room.players.length < totalPlayers) {
      alert(`❌ Недостаточно игроков! Нужно: ${totalPlayers}, есть: ${room.players.length}`);
      return;
    }

    await supabaseClient
      .from('battle_rooms')
      .update({ status: 'playing' })
      .eq('id', GameState.currentRoomId);

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
    alert('❌ Онлайн режим недоступен!');
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

    GameState.currentRoomId = data.id;
    isRoomHost = true;
    GameState.multiplayerMode = false;
    
    console.log(`✅ Комната создана: ${roomCode}`);
    console.log(`✅ Room ID: ${GameState.currentRoomId}`);
    
    showWaitingScreen(roomCode, mode, [currentUser], true);
    subscribeToRoomChanges(GameState.currentRoomId, mode);

  } catch (error) {
    console.error('❌ Ошибка создания комнаты:', error);
    alert('Ошибка: ' + error.message);
  }
}

// ========== ПОДПИСКА НА ИЗМЕНЕНИЯ ==========
async function subscribeToRoomChanges(roomId, mode) {
  if (!supabaseClient) return;

  console.log(`📡 Подписываемся на комнату ${roomId}`);

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
      
      console.log(`👥 Игроков: ${players.length}/${totalPlayers} | Статус: ${room.status}`);

      updateLobbyPlayers(players, mode);

      if (room.status === 'playing') {
        console.log('✅ ХОСТ ЗАПУСТИЛ БОЙ!');
        const overlay = document.getElementById('waiting-overlay');
        if (overlay) overlay.remove();
        
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
        
        setTimeout(() => startMultiplayerBattle(roomId, mode), 500);
      }
    })
    .subscribe();

  startPolling(roomId, mode);
}

// ========== POLLING ==========
function startPolling(roomId, mode) {
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    try {
      const { data, error } = await supabaseClient
        .from('battle_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;

      updateLobbyPlayers(data.players || [], mode);

      if (data.status === 'playing') {
        clearInterval(pollingInterval);
        pollingInterval = null;
        const overlay = document.getElementById('waiting-overlay');
        if (overlay) overlay.remove();
        setTimeout(() => startMultiplayerBattle(roomId, mode), 500);
      }
    } catch (error) {
      console.error('❌ Polling ошибка:', error);
    }
  }, 2000);
}

// ========== ПРИСОЕДИНЕНИЕ ==========
async function joinRoom(roomCode) {
  console.log(`📌 Присоединяемся к: ${roomCode}`);

  if (!supabaseClient) {
    alert('❌ Supabase не подключен');
    return;
  }

  try {
    const { data: room, error } = await supabaseClient
      .from('battle_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (error) throw new Error('Комната не найдена!');

    const players = room.players || [];
    const totalPlayers = room.mode * 2;

    if (room.status !== 'waiting') throw new Error('Бой уже начался!');
    if (players.includes(currentUser)) throw new Error('Вы уже в комнате!');
    if (players.length >= totalPlayers) throw new Error('Комната полная!');

    players.push(currentUser);

    await supabaseClient
      .from('battle_rooms')
      .update({ players: players })
      .eq('id', room.id);

    GameState.currentRoomId = room.id;
    isRoomHost = false;
    GameState.multiplayerMode = false;
    
    console.log('✅ Присоединились');

    showWaitingScreen(roomCode, room.mode, players, false);
    subscribeToRoomChanges(room.id, room.mode);

  } catch (error) {
    console.error('❌ Ошибка:', error);
    alert('Ошибка: ' + error.message);
  }
}

// ========== НАЧАЛО БОЯ ==========
async function startMultiplayerBattle(roomId, mode) {
  console.log('⚔️⚔️⚔️ ЗАПУСК МУЛЬТИПЛЕЕРА!');
  console.log('Room:', roomId, 'Mode:', mode);
  
  // ✅ ВАЖНО: Устанавливаем ДО создания танков
  GameState.multiplayerMode = true;
  GameState.currentRoomId = roomId;
  GameState.multiplayerEnemies = [];
  GameState.multiplayerAllies = [];
  GameState.otherPlayers = {};
  GameState.units = [];
  
  try {
    const { data: room } = await supabaseClient
      .from('battle_rooms')
      .select('players, host_username')
      .eq('id', roomId)
      .single();

    const allPlayers = room.players || [];
    const hostUsername = room.host_username;

    console.log('👥 Все:', allPlayers);
    console.log('👑 Хост:', hostUsername);
    console.log('👤 Я:', currentUser);

    const hostTeam = [];
    const enemyTeam = [];

    allPlayers.forEach((player, index) => {
      if (mode === 1) {
        if (player === hostUsername) hostTeam.push(player);
        else enemyTeam.push(player);
      } else {
        if (index < 2) hostTeam.push(player);
        else enemyTeam.push(player);
      }
    });

    const isInHostTeam = hostTeam.includes(currentUser);
    GameState.multiplayerAllies = (isInHostTeam ? hostTeam : enemyTeam).filter(p => p !== currentUser);
    GameState.multiplayerEnemies = isInHostTeam ? enemyTeam : hostTeam;

    console.log('🟢 Союзники:', GameState.multiplayerAllies);
    console.log('🔴 Враги:', GameState.multiplayerEnemies);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }

  // Создаём танк игрока
  const bonuses = getAllBonuses(GameState.selected);
  GameState.player = new Tank(GameState.selected, -1500, 0, 'player', bonuses);
  GameState.units = [GameState.player];
  
  // ✅ Создаём ПРЕ-танки для других игроков
  await createOtherPlayersTanks(roomId);
  
  GameState.pendingBattle = mode * 2;
  document.getElementById('control-modal').classList.add('show');
}

// ========== СОЗДАНИЕ ТАНКОВ ИГРОКОВ ==========
async function createOtherPlayersTanks(roomId) {
  try {
    const { data } = await supabaseClient
      .from('battle_players')
      .select('*')
      .eq('room_id', roomId);

    if (data) {
      for (const pos of data) {
        if (pos.username !== currentUser) {
          const isEnemy = GameState.multiplayerEnemies.includes(pos.username);
          const isAlly = GameState.multiplayerAllies.includes(pos.username);
          
          if (isEnemy || isAlly) {
            console.log('➕ Создаю танк:', pos.username, isEnemy ? 'ВРАГ' : 'СОЮЗНИК');
            
            const tank = new Tank(
              pos.tank_id || 'T26',
              isEnemy ? 1200 : -1200,
              Math.random() * 400 - 200,
              isEnemy ? 'enemy' : 'ally'
            );
            
            tank.hp = pos.hp || tank.maxHp;
            tank.maxHp = pos.max_hp || tank.maxHp;
            tank.angle = pos.angle || (isEnemy ? Math.PI : 0);
            tank.tAngle = pos.turret_angle || tank.angle;
            
            GameState.otherPlayers[pos.username] = tank;
            GameState.units.push(tank);
          }
        }
      }
      console.log('✅ Танки созданы. Всего юнитов:', GameState.units.length);
    }
  } catch (error) {
    console.error('❌ Ошибка создания танков:', error);
  }
}

// ========== СИНХРОНИЗАЦИЯ ПОЗИЦИЙ ==========
async function syncPlayerPositions(roomId) {
  if (!GameState.multiplayerMode || !GameState.player || !supabaseClient) return;

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
        on_fire: GameState.player.onFire || false,
        updated_at: new Date().toISOString()
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
          if (pos && pos.username !== currentUser) {
            updateOtherPlayer(pos);
          }
        })
        .subscribe();

      // Резервный polling
      setInterval(async () => {
        try {
          const { data } = await supabaseClient
            .from('battle_players')
            .select('*')
            .eq('room_id', roomId)
            .neq('username', currentUser);
          if (data) data.forEach(pos => updateOtherPlayer(pos));
        } catch (err) {}
      }, 300);
    }

    if (GameState.multiplayerMode && GameState.gameActive) {
      setTimeout(() => syncPlayerPositions(roomId), 100);
    }
  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error);
  }
}

function updateOtherPlayer(posData) {
  const isEnemy = GameState.multiplayerEnemies.includes(posData.username);
  const isAlly = GameState.multiplayerAllies.includes(posData.username);

  if (!isEnemy && !isAlly) return;

  let tank = GameState.otherPlayers[posData.username];
  
  if (!tank) {
    console.log('➕ Новый игрок:', pos.username);
    tank = new Tank(
      posData.tank_id || 'T26',
      posData.x,
      posData.y,
      isEnemy ? 'enemy' : 'ally'
    );
    GameState.otherPlayers[posData.username] = tank;
    GameState.units.push(tank);
    updateScoreboard();
  }

  tank.x = posData.x;
  tank.y = posData.y;
  tank.angle = posData.angle;
  tank.tAngle = posData.turret_angle;
  tank.hp = Math.max(0, posData.hp);
  tank.maxHp = posData.max_hp;
  tank.dead = !posData.is_alive;
  tank.trackBroken = posData.track_broken;
  tank.onFire = posData.on_fire;
}

// ========== СИНХРОНИЗАЦИЯ ВЫСТРЕЛОВ ==========
async function syncPlayerShots(roomId) {
  if (!GameState.multiplayerMode || !supabaseClient) return;

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
            x: shot.x, y: shot.y, a: shot.angle,
            team: 'enemy', dmg: 50, speed: 12,
            color: '#ff8800', st: shot.shell_type,
            shooter: { name: shot.username }
          });
          snd('shot');
        }
      })
      .subscribe();
  }
}

async function sendShot(x, y, angle, shellType) {
  if (!GameState.currentRoomId || !GameState.multiplayerMode || !supabaseClient) return;
  try {
    await supabaseClient.from('player_shots').insert([{
      room_id: GameState.currentRoomId,
      username: currentUser,
      x: x, y: y, angle: angle, shell_type: shellType
    }]);
  } catch (error) {
    console.error('❌ Ошибка выстрела:', error);
  }
}

function endMultiplayerBattle() {
  GameState.multiplayerMode = false;

  if (positionSubscription) {
    positionSubscription.unsubscribe();
    positionSubscription = null;
  }

  if (shotSubscription) {
    shotSubscription.unsubscribe();
    shotSubscription = null;
  }

  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  GameState.otherPlayers = {};
  
  if (GameState.currentRoomId && supabaseClient) {
    supabaseClient.from('battle_rooms').update({ status: 'finished' }).eq('id', GameState.currentRoomId);
    GameState.currentRoomId = null;
  }

  isRoomHost = false;
  console.log('❌ Мультиплеер окончен');
}

console.log('🌐 multiplayer.js полностью загружен');