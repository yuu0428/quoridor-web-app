import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [playerId, setPlayerId] = useState(null);

  useEffect(() => {
    // 開発環境では自動検出、本番では手動設定
    const getServerUrl = () => {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
      } else {
        // Railway デプロイされたサーバー
        return 'https://quoridor-web-app-production.up.railway.app';
      }
    };

    const newSocket = io(getServerUrl(), {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('サーバーに接続しました');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('サーバーから切断されました');
    });

    newSocket.on('connect_error', (error) => {
      console.error('接続に失敗しました:', error);
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket エラー:', error);
    });

    newSocket.on('room-joined', ({ roomId, playerId: id }) => {
      setCurrentRoom(roomId);
      setPlayerId(id);
      console.log(`ルーム ${roomId} にプレイヤー${id}として参加しました`);
    });

    newSocket.on('player-move', (moveData) => {
      console.log('プレイヤーの移動を受信:', moveData);
    });

    newSocket.on('wall-placed', (wallData) => {
      console.log('壁の配置を受信:', wallData);
    });

    newSocket.on('game-state', (gameState) => {
      console.log('ゲーム状態の更新:', gameState);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const connectToServer = () => {
    if (socket && !isConnected) {
      socket.connect();
    }
  };

  const disconnectFromServer = () => {
    if (socket && isConnected) {
      socket.disconnect();
    }
  };

  const joinRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('join-room', roomId);
    }
  };

  const createRoom = () => {
    if (socket && isConnected) {
      socket.emit('create-room');
    }
  };

  const sendMove = (moveData) => {
    if (socket && isConnected && currentRoom) {
      socket.emit('player-move', {
        roomId: currentRoom,
        playerId,
        ...moveData
      });
    }
  };

  const sendWallPlacement = (wallData) => {
    if (socket && isConnected && currentRoom) {
      socket.emit('wall-placed', {
        roomId: currentRoom,
        playerId,
        ...wallData
      });
    }
  };

  const value = {
    socket,
    isConnected,
    currentRoom,
    playerId,
    connectToServer,
    disconnectFromServer,
    joinRoom,
    createRoom,
    sendMove,
    sendWallPlacement
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};