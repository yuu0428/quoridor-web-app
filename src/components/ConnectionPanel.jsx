import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

export default function ConnectionPanel() {
  const {
    isConnected,
    currentRoom,
    playerId,
    connectToServer,
    disconnectFromServer,
    joinRoom,
    createRoom
  } = useSocket();

  const [roomInput, setRoomInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isConnected]);

  return (
    <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '16px', minWidth: '320px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>オンライン対戦</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            backgroundColor: isConnected ? '#10b981' : '#ef4444' 
          }} />
          <span style={{ fontWeight: '500' }}>
            {isConnected ? '接続中' : '未接続'}
          </span>
        </div>

        {currentRoom && (
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <div>ルーム: {currentRoom}</div>
            <div>プレイヤー: {playerId}</div>
          </div>
        )}

        {!isConnected ? (
          <button
            onClick={() => {
              console.log('接続ボタンがクリックされました');
              setConnectionStatus('connecting');
              connectToServer();
            }}
            disabled={connectionStatus === 'connecting'}
            style={{
              width: '100%',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: connectionStatus === 'connecting' ? 'not-allowed' : 'pointer',
              backgroundColor: connectionStatus === 'connecting' ? '#eab308' : '#10b981',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {connectionStatus === 'connecting' ? '接続中...' : 'サーバーに接続'}
          </button>
        ) : (
          <button
            onClick={disconnectFromServer}
            style={{
              width: '100%',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            切断
          </button>
        )}

        {isConnected && !currentRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={createRoom}
              style={{
                width: '100%',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              新しい部屋を作る
            </button>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="ルームID"
                style={{
                  flex: 1,
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                onClick={() => {
                  if (roomInput.trim()) {
                    joinRoom(roomInput.trim());
                    setRoomInput('');
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                参加
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}