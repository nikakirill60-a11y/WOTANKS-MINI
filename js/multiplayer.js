// js/multiplayer.js
console.log('🌐 multiplayer.js загружен');

let currentRoomId = null;
let multiplayerMode = false;
let otherPlayers = {}; // { username: playerData }
let positionSubscription = null;
let shotSubscription = null;

// ========== ПОИСК ИГРОКОВ ==========
async function startMultiplayerSearch(mode) {
  console.log(`🔍 Ищем игроков на режим ${mode}x${mode}...`);
  
  // Генерируем код комнаты
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    // Создаём комнату
    const { data, error } = await supabaseClient
      .from('battle_rooms')
      .insert([{
        room_code: roomCode,
        host_username: currentUser,
        mode: mode,
        players: JSON.stringify([currentUser]),
        status: 'waiting'
      }])
      .select()
      .single();

    if (error) throw error;

    currentRoomId = data.id;
    console.log(`✅ Комната создана: ${roomCode}`);

    // Показываем экран ожидания
    showWaitingScreen(roomCode, mode);

    // Слушаем других игроков
    subscribeToRoomChanges(currentRoomId, mode);

  } catch (error) {
    console.error('❌ Ошибка создания комнаты:', error);
    alert('Ошибка подключения к серверу');
  }
}

function showWaitingScreen(roomCode, mode) {
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

  overlay.innerHTML = `
    <div style="text-align: center; color: #fff;">
      <h2 style="margin-bottom: 20px;">🔍 ПОИСК ИГРОКОВ</h2>
      <div style="font-size: 18px; margin: 10px 0;">
        Режим: <strong>${mode}x${mode}</strong>
      </div>
      <div style="font-size: 16px; margin: 20px 0; padding: 15px; background: #222; border-radius: 8px;">
        Код комнаты: <span style="color: #f1c40f; font-weight: bold; font-size: 20px;">${roomCode}</span>
      </div>
      <div style="font-size: 14px; color: #aaa; margin: 20px 0;">
        ⏳ Ожидание противника...
      </div>
      <div class="spinner" style="margin: 20px 0;">
        <div style="width: 40px; height: 40px; border: 4px solid #555; border-top-color: #f39c12; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      </div>
      <button class="btn" style="margin-top: 20px;" onclick="cancelMultiplayerSearch()">
        ✕ ОТМЕНА
      </button>
    </div>
    
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;

  document.body.appendChild(overlay);
}

function cancelMultiplayerSearch() {
  const overlay = document.getElementById('waiting-overlay');
  if (overlay) overlay.remove();

  if (currentRoomId) {
    supabaseClient
      .from('battle_rooms')
      .delete()
      .eq('id', currentRoomId);
    
    currentRoomId = null;
  }

  console.log('❌ Поиск отменён');
}

async function subscribeToRoomChanges(roomId, mode) {
  // Слушаем изменения в комнате
  const subscription = supabaseClient
    .channel(`room:${roomId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'battle_rooms',
      filter: `id=eq.${roomId}`
    }, (payload) => {
      const room = payload.new;
      console.log(`👥 Игроков в комнате: ${room.players.length}/${mode}`);

      if (room.players.length >= mode && room.status === 'playing') {
        const overlay = document.getElementById('waiting-overlay');
        if (overlay) overlay.remove();
        
        startMultiplayerBattle(roomId, mode);
      }
    })
    .subscribe();
}

// ========== ПРИСОЕДИНЕНИЕ К КОМНАТЕ ==========
async function joinRoom(roomCode) {
  console.log(`📌 Присоединяемся к комнате: ${roomCode}`);

  try {
    // Ищем комнату
    const { data: rooms, error } = await supabaseClient
      .from('battle_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (error) throw new Error('Комната не найдена!');

    const room = rooms;
    const players = JSON.parse(room.players);

    if (players.includes(currentUser)) {
      throw new Error('Вы уже в этой комнате!');
    }

    // Добавляем себя
    players.push(currentUser);

    await supabaseClient
      .from('battle_rooms')
      .update({ 
        players: JSON.stringify(players),
        status: players.length >= room.mode ? 'playing' : 'waiting'
      })
      .eq('id', room.id);

    currentRoomId = room.id;
    console.log('✅ Присоединились к комнате');

    showWaitingScreen(roomCode, room.mode);
    subscribeToRoomChanges(room.id, room.mode);

  } catch (error) {
    console.error('❌ Ошибка подключения:', error);
    alert('Ошибка: ' + error.message);
  }
}

// ========== БОЙ ==========
async function startMultiplayerBattle(roomId, mode) {
  console.log('⚔️ Начинаем мультиплеер бой!');
  
  multiplayerMode = true;
  
  // Стартуем обычный бой
  startBattle(mode);

  // Синхронизируем позиции игроков
  syncPlayerPositions(roomId);
  
  // Синхронизируем выстрелы
  syncPlayerShots(roomId);
}

async function syncPlayerPositions(roomId) {
  if (!multiplayerMode || !GameState.player) return;

  // Отправляем свою позицию
  await supabaseClient
    .from('player_positions')
    .upsert({
      room_id: roomId,
      username: currentUser,
      x: GameState.player.x,
      y: GameState.player.y,
      angle: GameState.player.angle,
      turret_angle: GameState.player.tAngle,
      hp: GameState.player.hp,
      updated_at: new Date().toISOString()
    }, { onConflict: 'room_id,username' });

  // Слушаем позиции других
  if (!positionSubscription) {
    positionSubscription = supabaseClient
      .channel(`positions:${roomId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'player_positions',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const pos = payload.new;
        if (pos.username !== currentUser) {
          updateOtherPlayer(pos);
        }
      })
      .subscribe();
  }

  // Повторяем каждые 100ms
  if (multiplayerMode) {
    setTimeout(() => syncPlayerPositions(roomId), 100);
  }
}

function updateOtherPlayer(posData) {
  // Создаём или обновляем врага
  if (!otherPlayers[posData.username]) {
    const tankData = DB[GameState.selected] || DB['T26'];
    otherPlayers[posData.username] = new Tank(
      'T26',
      posData.x,
      posData.y,
      'enemy'
    );
  }

  const player = otherPlayers[posData.username];
  player.x = posData.x;
  player.y = posData.y;
  player.angle = posData.angle;
  player.tAngle = posData.turret_angle;
  player.hp = Math.max(0, posData.hp);
}

async function syncPlayerShots(roomId) {
  if (!multiplayerMode) return;

  // Слушаем выстрелы других игроков
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
          // Создаём пулю другого игрока
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
        }
      })
      .subscribe();
  }
}

// Отправляем выстрел
async function sendShot(x, y, angle, shellType) {
  if (!currentRoomId || !multiplayerMode) return;

  await supabaseClient
    .from('player_shots')
    .insert([{
      room_id: currentRoomId,
      username: currentUser,
      x: x,
      y: y,
      angle: angle,
      shell_type: shellType
    }]);
}

// Завершаем мультиплеер
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
  
  // Удаляем комнату
  if (currentRoomId) {
    supabaseClient
      .from('battle_rooms')
      .delete()
      .eq('id', currentRoomId);
    
    currentRoomId = null;
  }

  console.log('❌ Мультиплеер окончен');
}