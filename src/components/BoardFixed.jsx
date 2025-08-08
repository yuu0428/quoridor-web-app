import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

export default function BoardFixed() {
  const { socket, sendMove, sendWallPlacement, currentRoom, playerId } = useSocket();
  
  const [selectedPawn, setSelectedPawn] = useState(null);
  const [isWallMode, setIsWallMode] = useState(false);
  const [wallOrientation, setWallOrientation] = useState('vertical');
  const [pawns, setPawns] = useState([
    { id: 1, row: 0, col: 4, player: 1 },
    { id: 2, row: 8, col: 4, player: 2 }
  ]);
  const [walls, setWalls] = useState([]);
  const [wallCounts, setWallCounts] = useState({ 1: 10, 2: 10 });
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [winner, setWinner] = useState(null);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket) return;

    const handlePlayerMove = (moveData) => {
      const { newRow, newCol, player } = moveData;
      const updatedPawns = pawns.map(pawn => 
        pawn.player === player ? { ...pawn, row: newRow, col: newCol } : pawn
      );
      setPawns(updatedPawns);
      
      // Check win condition
      const player1Pawn = updatedPawns.find(p => p.player === 1);
      const player2Pawn = updatedPawns.find(p => p.player === 2);
      
      if (player1Pawn && player1Pawn.row === 8) {
        setWinner(1);
      } else if (player2Pawn && player2Pawn.row === 0) {
        setWinner(2);
      } else {
        setCurrentPlayer(prev => prev === 1 ? 2 : 1);
      }
    };

    const handleWallPlaced = (wallData) => {
      const { row, col, orientation, player } = wallData;
      const newWall = { row, col, orientation, id: Date.now(), player };
      setWalls(prev => [...prev, newWall]);
      setWallCounts(prev => ({ 
        ...prev, 
        [player]: prev[player] - 1 
      }));
      setCurrentPlayer(prev => prev === 1 ? 2 : 1);
    };

    socket.on('player-move', handlePlayerMove);
    socket.on('wall-placed', handleWallPlaced);

    return () => {
      socket.off('player-move', handlePlayerMove);
      socket.off('wall-placed', handleWallPlaced);
    };
  }, [socket, pawns]);

  const handleCellClick = (row, col) => {
    if (isWallMode) {
      // 壁配置モード：セルの周りに壁を配置
      handleWallPlacement(row, col);
      return;
    }
    
    if (selectedPawn) {
      if (isValidMove(row, col)) {
        movePawn(row, col);
      }
      setSelectedPawn(null);
    }
  };

  const handleWallPlacement = (row, col) => {
    // 現在のプレイヤーのターンか確認
    const isMyTurn = !currentRoom || playerId === currentPlayer;
    if (!isMyTurn || wallCounts[currentPlayer] <= 0) return;

    // 壁配置の境界チェック（8x8の位置まで配置可能）
    if (wallOrientation === 'vertical') {
      // 縦壁：右端は配置不可、下端は配置不可
      if (col >= 8 || row >= 8) return;
    } else {
      // 横壁：下端は配置不可、右端は配置不可
      if (row >= 8 || col >= 8) return;
    }

    const wallData = {
      row: row,
      col: col,
      orientation: wallOrientation,
      id: Date.now(),
      player: currentPlayer
    };

    // 壁の競合チェックと列/行制限チェック
    const wallExists = isWallConflict(row, col, wallOrientation);
    const canPlaceInLine = canPlaceWallInLine(row, col, wallOrientation);
    
    console.log(`壁配置試行: (${row},${col}) ${wallOrientation}, 競合=${wallExists}, 列制限=${canPlaceInLine}`);
    
    if (!wallExists && canPlaceInLine) {
      // 壁を配置
      setWalls(prev => {
        const newWalls = [...prev, wallData];
        console.log('壁配置完了:', wallData, '総壁数:', newWalls.length);
        return newWalls;
      });
      setWallCounts(prev => ({ 
        ...prev, 
        [currentPlayer]: prev[currentPlayer] - 1 
      }));

      // サーバーに送信またはターン切り替え
      if (currentRoom && playerId === currentPlayer) {
        sendWallPlacement(wallData);
      } else {
        setCurrentPlayer(prev => prev === 1 ? 2 : 1);
      }
    } else {
      if (wallExists) {
        console.log('壁配置失敗: 既に壁が存在します');
      }
      if (!canPlaceInLine) {
        console.log('壁配置失敗: この列/行には既に4枚の壁があります');
      }
    }
  };

  // 壁の競合をチェック（2マス占有の重複と交差をチェック）
  const isWallConflict = (row, col, orientation) => {
    return walls.some(wall => {
      if (wall.orientation === orientation) {
        // 同じ向きの壁：2マス分の重複をチェック
        if (orientation === 'horizontal') {
          // 横壁：(row,col)-(row,col+1) と (wall.row,wall.col)-(wall.row,wall.col+1) の重複
          return (wall.row === row && wall.col === col) ||           // 完全一致
                 (wall.row === row && wall.col === col - 1) ||       // 左にずれた既存壁
                 (wall.row === row && wall.col === col + 1);         // 右にずれた既存壁
        } else {
          // 縦壁：(row,col)-(row+1,col) と (wall.row,wall.col)-(wall.row+1,wall.col) の重複
          return (wall.row === row && wall.col === col) ||           // 完全一致
                 (wall.row === row - 1 && wall.col === col) ||       // 上にずれた既存壁
                 (wall.row === row + 1 && wall.col === col);         // 下にずれた既存壁
        }
      } else {
        // 異なる向きの壁：交差をチェック
        if (orientation === 'vertical') {
          // 配置する縦壁(row,col)-(row+1,col)と既存横壁(wall.row,wall.col)-(wall.row,wall.col+1)の交差
          return (wall.row === row && wall.col === col) ||
                 (wall.row === row + 1 && wall.col === col);
        } else {
          // 配置する横壁(row,col)-(row,col+1)と既存縦壁(wall.row,wall.col)-(wall.row+1,wall.col)の交差
          return (wall.row === row && wall.col === col) ||
                 (wall.row === row && wall.col === col + 1);
        }
      }
    });
  };

  // 列/行の壁数制限チェック（各列/行に最大4枚まで）
  const canPlaceWallInLine = (row, col, orientation) => {
    let count = 0;
    
    if (orientation === 'horizontal') {
      // 横壁：同じ行(row)の壁をカウント
      walls.forEach(wall => {
        if (wall.orientation === 'horizontal' && wall.row === row) {
          count++;
        }
      });
    } else {
      // 縦壁：同じ列(col)の壁をカウント
      walls.forEach(wall => {
        if (wall.orientation === 'vertical' && wall.col === col) {
          count++;
        }
      });
    }
    
    return count < 5; // 4枚未満なら配置可能
  };

  const handlePawnClick = (pawnId) => {
    const pawn = pawns.find(p => p.id === pawnId);
    
    // Turn and ownership restrictions
    const isMyTurn = !currentRoom || playerId === currentPlayer;
    const isMyPawn = !currentRoom || pawn.player === playerId;
    
    if (!isMyTurn || !isMyPawn) return;
    
    if (selectedPawn === pawnId) {
      setSelectedPawn(null);
    } else {
      setSelectedPawn(pawnId);
    }
  };

  const isValidMove = (row, col) => {
    if (!selectedPawn) return false;
    
    const pawn = pawns.find(p => p.id === selectedPawn);
    const rowDiff = pawn.row - row;
    const colDiff = pawn.col - col;
    
    // Adjacent move only
    if (Math.abs(rowDiff) + Math.abs(colDiff) !== 1) return false;
    
    // Check if cell is occupied
    const occupied = pawns.some(p => p.row === row && p.col === col);
    if (occupied) return false;
    
    // Check wall blocking
    return !isWallBlocking(pawn.row, pawn.col, row, col);
  };

  // 壁が移動を阻んでいるかチェック
  const isWallBlocking = (fromRow, fromCol, toRow, toCol) => {
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    
    return walls.some(wall => {
      if (wall.orientation === 'horizontal') {
        // 横壁：上下移動を阻む
        if (rowDiff === 1 && colDiff === 0) {
          // 下に移動：fromRowの下側の壁をチェック
          return wall.row === fromRow && (wall.col === fromCol || wall.col === fromCol - 1);
        } else if (rowDiff === -1 && colDiff === 0) {
          // 上に移動：toRowの下側の壁をチェック
          return wall.row === toRow && (wall.col === toCol || wall.col === toCol - 1);
        }
      } else {
        // 縦壁：左右移動を阻む
        if (rowDiff === 0 && colDiff === 1) {
          // 右に移動：fromColの右側の壁をチェック
          return wall.col === fromCol && (wall.row === fromRow || wall.row === fromRow - 1);
        } else if (rowDiff === 0 && colDiff === -1) {
          // 左に移動：toColの右側の壁をチェック
          return wall.col === toCol && (wall.row === toRow || wall.row === toRow - 1);
        }
      }
      return false;
    });
  };

  const movePawn = (row, col) => {
    const pawn = pawns.find(p => p.id === selectedPawn);
    
    // Update local state
    const updatedPawns = pawns.map(p => 
      p.id === selectedPawn ? { ...p, row, col } : p
    );
    setPawns(updatedPawns);
    
    // Check win condition
    const player1Pawn = updatedPawns.find(p => p.player === 1);
    const player2Pawn = updatedPawns.find(p => p.player === 2);
    
    if (player1Pawn && player1Pawn.row === 8) {
      setWinner(1);
      return;
    } else if (player2Pawn && player2Pawn.row === 0) {
      setWinner(2);
      return;
    }
    
    // Send to server or switch turns
    if (currentRoom && playerId === currentPlayer) {
      sendMove({
        pawnId: selectedPawn,
        newRow: row,
        newCol: col,
        player: pawn.player
      });
    } else {
      setCurrentPlayer(prev => prev === 1 ? 2 : 1);
    }
  };

  const getPossibleMoves = () => {
    if (!selectedPawn) return [];
    
    const pawn = pawns.find(p => p.id === selectedPawn);
    if (!pawn) return [];
    
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    directions.forEach(([dr, dc]) => {
      const newRow = pawn.row + dr;
      const newCol = pawn.col + dc;
      
      if (newRow >= 0 && newRow < 9 && newCol >= 0 && newCol < 9) {
        const occupied = pawns.some(p => p.row === newRow && p.col === newCol);
        const blocked = isWallBlocking(pawn.row, pawn.col, newRow, newCol);
        
        if (!occupied && !blocked) {
          moves.push([newRow, newCol]);
        }
      }
    });
    
    return moves;
  };

  const resetGame = () => {
    setPawns([
      { id: 1, row: 0, col: 4, player: 1 },
      { id: 2, row: 8, col: 4, player: 2 }
    ]);
    setWalls([]);
    setWallCounts({ 1: 10, 2: 10 });
    setCurrentPlayer(1);
    setWinner(null);
    setSelectedPawn(null);
  };

  // Cell component
  const Cell = ({ row, col, onClick, isHighlighted, children }) => (
    <div
      style={{
        width: '48px',
        height: '48px',
        border: '1px solid #9ca3af',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backgroundColor: isHighlighted ? '#bbf7d0' : '#fffbeb'
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );

  // Pawn component
  const Pawn = ({ pawn, isSelected, onClick }) => (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        cursor: 'pointer',
        backgroundColor: pawn.player === 1 ? '#3b82f6' : '#ef4444',
        border: isSelected ? '4px solid #facc15' : 'none',
        boxSizing: 'border-box',
        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
        transition: 'all 0.15s'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    />
  );

  // Wall component
  const Wall = ({ wall }) => {
    if (wall.orientation === 'horizontal') {
      return (
        <div
          style={{
            position: 'absolute',
            width: '96px', // 2セル分
            height: '8px',
            backgroundColor: '#1f2937',
            top: `${(wall.row + 1) * 48 - 4}px`, // セル境界の真ん中
            left: `${wall.col * 48}px`,
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      );
    } else {
      return (
        <div
          style={{
            position: 'absolute',
            width: '8px',
            height: '96px', // 2セル分
            backgroundColor: '#1f2937',
            top: `${wall.row * 48}px`,
            left: `${(wall.col + 1) * 48 - 4}px`, // セル境界の真ん中
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      );
    }
  };

  if (winner) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
        <div style={{ 
          padding: '24px', 
          backgroundColor: '#fef3c7', 
          border: '2px solid #f59e0b', 
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', marginBottom: '12px' }}>
            プレイヤー{winner}の勝利！
          </div>
          <button
            onClick={resetGame}
            style={{
              padding: '8px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            新しいゲーム
          </button>
        </div>
      </div>
    );
  }

  const possibleMoves = getPossibleMoves();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 'bold' }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: currentPlayer === 1 ? '#3b82f6' : '#ef4444'
          }} />
          <span>プレイヤー{currentPlayer}の手番</span>
          {currentRoom && (
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              （あなたはプレイヤー{playerId}）
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => {
              setIsWallMode(!isWallMode);
              setSelectedPawn(null);
            }}
            disabled={currentRoom && playerId !== currentPlayer}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '18px',
              border: 'none',
              cursor: currentRoom && playerId !== currentPlayer ? 'not-allowed' : 'pointer',
              backgroundColor: isWallMode ? '#f97316' : '#e5e7eb',
              color: isWallMode ? 'white' : '#374151',
              opacity: currentRoom && playerId !== currentPlayer ? 0.5 : 1
            }}
          >
            {isWallMode ? '壁配置モード' : '移動モード'}
          </button>
          
          {isWallMode && (
            <button
              onClick={() => setWallOrientation(wallOrientation === 'vertical' ? 'horizontal' : 'vertical')}
              disabled={currentRoom && playerId !== currentPlayer}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                border: '2px solid #6b7280',
                cursor: currentRoom && playerId !== currentPlayer ? 'not-allowed' : 'pointer',
                backgroundColor: 'white',
                color: '#374151',
                opacity: currentRoom && playerId !== currentPlayer ? 0.5 : 1
              }}
            >
              {wallOrientation === 'vertical' ? '縦壁 |' : '横壁 ―'}
            </button>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: '500', color: '#374151' }}>
            残り壁数: {wallCounts[1]}/{wallCounts[2]}
          </div>
        </div>
      </div>
      
      <div style={{ 
        border: '2px solid #1f2937', 
        backgroundColor: '#f3f0e1', 
        padding: '0',
        position: 'relative' 
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(9, 1fr)', 
          gap: '0px' 
        }}>
          {Array.from({ length: 81 }, (_, i) => {
            const row = Math.floor(i / 9);
            const col = i % 9;
            const pawn = pawns.find(p => p.row === row && p.col === col);
            const isHighlighted = !isWallMode && possibleMoves.some(([r, c]) => r === row && c === col);
            
            return (
              <Cell
                key={`${row}-${col}`}
                row={row}
                col={col}
                onClick={() => handleCellClick(row, col)}
                isHighlighted={isHighlighted}
              >
                {pawn && (
                  <Pawn
                    pawn={pawn}
                    isSelected={selectedPawn === pawn.id}
                    onClick={() => handlePawnClick(pawn.id)}
                  />
                )}
              </Cell>
            );
          })}
        </div>
        
        {/* 壁を描画 */}
        {walls.map(wall => (
          <Wall key={wall.id} wall={wall} />
        ))}
      </div>
    </div>
  );
}