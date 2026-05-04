// js/chat.js
console.log('💬 chat.js загружен');

let currentChatTab = 'global';
let chatSubscription = null;
let roomChatSubscription = null;

function toggleChat() {
  const panel = document.getElementById('chat-panel');
  const btn = document.getElementById('chat-toggle-btn');
  if (!panel || !btn) return;
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.style.display = 'none';
    loadChatMessages();
  } else {
    panel.style.display = 'none';
    btn.style.display = 'block';
  }
}

function switchChatTab(tab) {
  currentChatTab = tab;
  const globalBtn = document.getElementById('chat-tab-global');
  const roomBtn = document.getElementById('chat-tab-room');
  if (globalBtn) globalBtn.style.background = tab === 'global' ? '#3498db' : '#555';
  if (roomBtn) roomBtn.style.background = tab === 'room' ? '#3498db' : '#555';
  loadChatMessages();
}

async function loadChatMessages() {
  const chatEl = document.getElementById('chat-messages');
  if (!chatEl) return;
  chatEl.innerHTML = '';
  
  if (!supabaseClient) {
    chatEl.innerHTML = '<div class="chat-message system">⚠️ Чат недоступен</div>';
    return;
  }
  
  const roomId = currentChatTab === 'room' ? GameState.currentRoomId : null;
  
  try {
    let query = supabaseClient.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(50);
    if (roomId) {
      query = query.eq('room_id', roomId);
    } else {
      query = query.is('room_id', null);
    }
    
    const { data } = await query;
    
    if (data) {
      data.forEach(msg => displayChatMessage(msg));
    }
    
    // Подписка
    if (currentChatTab === 'global' && !chatSubscription) {
      chatSubscription = supabaseClient.channel('global_chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'room_id=is.null' }, payload => {
          displayChatMessage(payload.new);
        }).subscribe();
    } else if (currentChatTab === 'room' && roomId && !roomChatSubscription) {
      roomChatSubscription = supabaseClient.channel(`room_chat:${roomId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, payload => {
          displayChatMessage(payload.new);
        }).subscribe();
    }
    
    chatEl.scrollTop = chatEl.scrollHeight;
  } catch (error) {
    console.error('❌ Ошибка чата:', error);
  }
}

function displayChatMessage(msg) {
  const chatEl = document.getElementById('chat-messages');
  if (!chatEl) return;
  
  const isRoomMsg = msg.room_id !== null;
  if (currentChatTab === 'global' && isRoomMsg) return;
  if (currentChatTab === 'room' && !isRoomMsg) return;
  
  const time = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const isSelf = msg.username === currentUser;
  
  const div = document.createElement('div');
  div.className = 'chat-message' + (isRoomMsg ? ' room' : '');
  div.innerHTML = `
    <div><span class="chat-username ${isSelf ? 'self' : ''}">${msg.username}</span><span class="chat-time">${time}</span></div>
    <div class="chat-text">${escapeHtml(msg.message)}</div>
  `;
  
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input ? input.value.trim() : '';
  if (!message || !supabaseClient) return;
  
  try {
    const roomId = currentChatTab === 'room' ? GameState.currentRoomId : null;
    await supabaseClient.from('chat_messages').insert([{
      username: currentUser,
      message: message,
      room_id: roomId,
      created_at: new Date().toISOString()
    }]);
    if (input) input.value = '';
  } catch (error) {
    console.error('❌ Ошибка отправки:', error);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function cleanupChatSubscriptions() {
  if (chatSubscription) { chatSubscription.unsubscribe(); chatSubscription = null; }
  if (roomChatSubscription) { roomChatSubscription.unsubscribe(); roomChatSubscription = null; }
}

window.addEventListener('beforeunload', cleanupChatSubscriptions);

// Экспорт
window.toggleChat = toggleChat;
window.switchChatTab = switchChatTab;
window.sendChatMessage = sendChatMessage;

console.log('💬 chat.js полностью загружен');