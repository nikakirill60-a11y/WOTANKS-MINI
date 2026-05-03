// js/multiplayer.js (обновлённые функции)

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
    console.log(`✅ Комната создана: ${roomCode}`);
    showWaitingScreen(roomCode, mode);
    subscribeToRoomChanges(currentRoomId, mode);

  } catch (error) {
    console.error('❌ Ошибка создания комнаты:', error);
    alert('Ошибка подключения к серверу');
  }
}

async function subscribeToRoomChanges(roomId, mode) {
  if (!supabaseClient) return;

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

    if (players.includes(currentUser)) {
      throw new Error('Вы уже в этой комнате!');
    }

    players.push(currentUser);

    await supabaseClient
      .from('battle_rooms')
      .update({ 
        players: players,
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

async function syncPlayerPositions(roomId) {
  if (!multiplayerMode || !GameState.player || !supabaseClient) return;

  try {
    await supabaseClient
      .from('player_positions')
      .upsert({
        room_id: roomId,
        username: currentUser,
        x: GameState.player.x,
        y: GameState.player.y,
        angle: GameState.player.angle,
        turret_angle: GameState.player.tAngle,
        hp: GameState.player.hp
      }, { onConflict: ['room_id', 'username'] });

    if (!positionSubscription) {
      positionSubscription = supabaseClient
        .channel(`positions:${roomId}`)
        .on('postgres_changes', {
          event: '*',
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

    if (multiplayerMode) {
      setTimeout(() => syncPlayerPositions(roomId), 100);
    }
  } catch (error) {
    console.error('❌ Ошибка синхронизации позиций:', error);
  }
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
  }

  console.log('❌ Мультиплеер окончен');
}