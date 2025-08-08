const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// ゲームルームを管理するオブジェクト
const gameRooms = new Map();

// ルーム作成
function createRoom() {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const gameState = {
    id: roomId,
    players: {},
    currentPlayer: 1,
    pawns: [
      { id: 1, row: 0, col: 4, player: 1 },
      { id: 2, row: 8, col: 4, player: 2 }
    ],
    walls: [],
    wallCounts: { 1: 10, 2: 10 },
    winner: null
  };
  
  gameRooms.set(roomId, gameState);
  return gameState;
}

io.on('connection', (socket) => {
  console.log('プレイヤー接続:', socket.id);

  // ルーム作成
  socket.on('create-room', () => {
    const gameState = createRoom();
    const roomId = gameState.id;
    
    socket.join(roomId);
    gameState.players[socket.id] = { id: socket.id, player: 1 };
    
    socket.emit('room-joined', { 
      roomId: roomId, 
      playerId: 1,
      gameState: gameState 
    });
    
    console.log(`ルーム ${roomId} 作成, プレイヤー1: ${socket.id}`);
  });

  // ルーム参加
  socket.on('join-room', (roomId) => {
    const gameState = gameRooms.get(roomId);
    
    if (!gameState) {
      socket.emit('error', { message: 'ルームが見つかりません' });
      return;
    }

    const playerCount = Object.keys(gameState.players).length;
    if (playerCount >= 2) {
      socket.emit('error', { message: 'ルームが満員です' });
      return;
    }

    socket.join(roomId);
    const playerId = playerCount + 1;
    gameState.players[socket.id] = { id: socket.id, player: playerId };
    
    socket.emit('room-joined', { 
      roomId: roomId, 
      playerId: playerId,
      gameState: gameState 
    });

    // 他のプレイヤーに参加通知
    socket.to(roomId).emit('player-joined', { 
      playerId: playerId,
      gameState: gameState 
    });
    
    console.log(`プレイヤー${playerId} (${socket.id}) がルーム ${roomId} に参加`);
  });

  // プレイヤーの動き
  socket.on('player-move', (data) => {
    const { roomId, playerId, pawnId, newRow, newCol, player } = data;
    const gameState = gameRooms.get(roomId);
    
    if (!gameState || gameState.currentPlayer !== playerId) {
      return;
    }

    // ゲーム状態更新
    gameState.pawns = gameState.pawns.map(pawn => 
      pawn.player === player ? { ...pawn, row: newRow, col: newCol } : pawn
    );

    // 勝利条件チェック
    const player1Pawn = gameState.pawns.find(p => p.player === 1);
    const player2Pawn = gameState.pawns.find(p => p.player === 2);
    
    if (player1Pawn && player1Pawn.row === 8) {
      gameState.winner = 1;
    } else if (player2Pawn && player2Pawn.row === 0) {
      gameState.winner = 2;
    } else {
      gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    }

    // 全プレイヤーに移動を通知
    io.to(roomId).emit('player-move', { 
      pawnId, 
      newRow, 
      newCol, 
      player,
      currentPlayer: gameState.currentPlayer,
      winner: gameState.winner 
    });
    
    console.log(`ルーム ${roomId}: プレイヤー${player} が (${newRow}, ${newCol}) に移動`);
  });

  // 壁配置
  socket.on('wall-placed', (data) => {
    const { roomId, playerId, row, col, orientation, player } = data;
    const gameState = gameRooms.get(roomId);
    
    if (!gameState || gameState.currentPlayer !== playerId || gameState.wallCounts[player] <= 0) {
      return;
    }

    // 壁追加
    const newWall = { row, col, orientation, id: Date.now(), player };
    gameState.walls.push(newWall);
    gameState.wallCounts[player]--;
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;

    // 全プレイヤーに壁配置を通知
    io.to(roomId).emit('wall-placed', {
      row,
      col,
      orientation,
      player,
      currentPlayer: gameState.currentPlayer,
      wallCounts: gameState.wallCounts
    });
    
    console.log(`ルーム ${roomId}: プレイヤー${player} が壁を配置 (${row}, ${col}, ${orientation})`);
  });

  // ゲームリセット
  socket.on('reset-game', (roomId) => {
    const gameState = gameRooms.get(roomId);
    if (!gameState) return;

    gameState.pawns = [
      { id: 1, row: 0, col: 4, player: 1 },
      { id: 2, row: 8, col: 4, player: 2 }
    ];
    gameState.walls = [];
    gameState.wallCounts = { 1: 10, 2: 10 };
    gameState.currentPlayer = 1;
    gameState.winner = null;

    io.to(roomId).emit('game-state', gameState);
    console.log(`ルーム ${roomId}: ゲームリセット`);
  });

  // 切断処理
  socket.on('disconnect', () => {
    console.log('プレイヤー切断:', socket.id);
    
    // プレイヤーがいたルームを検索して削除
    for (const [roomId, gameState] of gameRooms.entries()) {
      if (gameState.players[socket.id]) {
        delete gameState.players[socket.id];
        
        // ルームが空になったら削除
        if (Object.keys(gameState.players).length === 0) {
          gameRooms.delete(roomId);
          console.log(`ルーム ${roomId} を削除`);
        } else {
          // 他のプレイヤーに切断を通知
          socket.to(roomId).emit('player-disconnected', { 
            playerId: socket.id 
          });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IOサーバー起動: ポート${PORT}`);
  console.log('環境:', process.env.NODE_ENV);
});

// ヘルスチェック用
app.get('/', (req, res) => {
  res.json({ 
    message: 'Quoridor Socket.IO Server',
    rooms: gameRooms.size,
    timestamp: new Date().toISOString()
  });
});