import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { getValidMoves, isWallPlacementConflicting, wouldBlockAllPaths, checkWinCondition } from '../utils/gameLogic';
import Cell from './Cell';
import Pawn from './Pawn';
import Wall from './Wall';
import WallSlot from './WallSlot';

export default function Board() {
  const { socket, sendMove, sendWallPlacement, currentRoom, playerId } = useSocket();
  
  const [selectedPawn, setSelectedPawn] = useState(null);
  const [isWallMode, setIsWallMode] = useState(false);
  const [previewWall, setPreviewWall] = useState(null);
  const [wallOrientation, setWallOrientation] = useState('horizontal');
  const [pawns, setPawns] = useState([
    { id: 1, row: 0, col: 4, player: 1 }, // Player 1 starts at top
    { id: 2, row: 8, col: 4, player: 2 }  // Player 2 starts at bottom
  ]);
  const [walls, setWalls] = useState([]);
  const [wallCounts, setWallCounts] = useState({ 1: 10, 2: 10 });
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (!isWallMode) return;

    const onKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        setWallOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
        setPreviewWall(null);
      }
      if (e.key === 'Escape') {
        setIsWallMode(false);
        setPreviewWall(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isWallMode]);

  useEffect(() => {
    if (!socket) return;

    const handlePlayerMove = (moveData) => {
      const { newRow, newCol, player } = moveData;

      setPawns((prevPawns) => {
        const current = prevPawns.find((p) => p.player === player);
        if (current && current.row === newRow && current.col === newCol) return prevPawns; // ignore echo

        const updatedPawns = prevPawns.map((pawn) =>
          pawn.player === player ? { ...pawn, row: newRow, col: newCol } : pawn
        );

        const winResult = checkWinCondition(updatedPawns);
        if (winResult) {
          setWinner(winResult);
        } else {
          setCurrentPlayer((prev) => (prev === 1 ? 2 : 1));
        }

        return updatedPawns;
      });
    };

    const handleWallPlaced = (wallData) => {
      const { row, col, orientation, player } = wallData;
      setWalls((prevWalls) => {
        const alreadyThere = prevWalls.some(
          (w) => w.row === row && w.col === col && w.orientation === orientation
        );
        if (alreadyThere) return prevWalls; // ignore echo (also avoids double-decrement / double-toggle)

        setWallCounts((prev) => ({
          ...prev,
          [player]: prev[player] - 1
        }));
        setCurrentPlayer((prev) => (prev === 1 ? 2 : 1));

        return [...prevWalls, { row, col, orientation, id: Date.now(), player }];
      });
    };

    const handleGameState = (gameState) => {
      setPawns(gameState.pawns);
      setWalls(gameState.walls);
      setWallCounts(gameState.wallCounts);
      setCurrentPlayer(gameState.currentPlayer);
      setWinner(checkWinCondition(gameState.pawns));
    };

    socket.on('player-move', handlePlayerMove);
    socket.on('wall-placed', handleWallPlaced);
    socket.on('game-state', handleGameState);

    return () => {
      socket.off('player-move', handlePlayerMove);
      socket.off('wall-placed', handleWallPlaced);
      socket.off('game-state', handleGameState);
    };
  }, [socket]);

  const handleCellClick = (row, col) => {
    if (isWallMode) return;
    
    if (selectedPawn) {
      if (isValidMove(selectedPawn, row, col)) {
        movePawn(selectedPawn, row, col);
      }
      setSelectedPawn(null);
    }
  };

  const handleWallSlotClick = (row, col, orientation) => {
    if (!isWallMode) return;
    
    const isMyTurn = !currentRoom || playerId === currentPlayer;
    if (!isMyTurn) return;

    if (canPlaceWall(row, col, orientation) && wallCounts[currentPlayer] > 0) {
      const newWall = { row, col, orientation, id: Date.now(), player: currentPlayer };
      
      // Update local state immediately
      setWalls(prev => [...prev, newWall]);
      setWallCounts(prev => ({ 
        ...prev, 
        [currentPlayer]: prev[currentPlayer] - 1 
      }));
      setPreviewWall(null);
      setCurrentPlayer(prev => prev === 1 ? 2 : 1);
      
      // Send wall placement to server if online
      if (currentRoom && playerId === currentPlayer) {
        sendWallPlacement({
          row,
          col,
          orientation,
          player: currentPlayer
        });
      }
    }
  };

  const canPlaceWall = (row, col, orientation) => {
    // Check if wall position is valid
    if (orientation === 'horizontal') {
      if (row < 0 || row >= 8 || col < 0 || col >= 8) return false;
    } else {
      if (row < 0 || row >= 8 || col < 0 || col >= 8) return false;
    }

    // Check overlap/crossing
    if (isWallPlacementConflicting(row, col, orientation, walls)) return false;

    // Check if wall would block all paths for either player
    const wouldBlockPlayer1 = wouldBlockAllPaths(row, col, orientation, pawns, walls, 1);
    const wouldBlockPlayer2 = wouldBlockAllPaths(row, col, orientation, pawns, walls, 2);
    
    return !wouldBlockPlayer1 && !wouldBlockPlayer2;
  };

  const handlePawnClick = (pawnId) => {
    const pawn = pawns.find(p => p.id === pawnId);
    
    // Only allow selecting own pawn and only on your turn
    const isMyTurn = !currentRoom || playerId === currentPlayer;
    const isMyPawn = !currentRoom || pawn.player === playerId;
    
    if (!isMyTurn || !isMyPawn) return;
    
    if (selectedPawn === pawnId) {
      setSelectedPawn(null);
    } else {
      setSelectedPawn(pawnId);
    }
  };

  const isValidMove = (pawnId, row, col) => {
    const pawn = pawns.find(p => p.id === pawnId);
    if (!pawn) return false;
    
    const validMoves = getValidMoves(pawn, pawns, walls);
    return validMoves.some(([r, c]) => r === row && c === col);
  };

  const movePawn = (pawnId, row, col) => {
    const pawn = pawns.find(p => p.id === pawnId);
    
    // Update local state immediately for responsiveness
    const updatedPawns = pawns.map(p => 
      p.id === pawnId ? { ...p, row, col } : p
    );
    setPawns(updatedPawns);
    
    // Check for win condition
    const winResult = checkWinCondition(updatedPawns);
    if (winResult) {
      setWinner(winResult);
      return;
    }
    
    // Send move to server if online
    if (currentRoom && playerId === currentPlayer) {
      sendMove({
        pawnId,
        newRow: row,
        newCol: col,
        player: pawn.player
      });
    }

    // Switch turns locally (keeps offline working and avoids waiting on server echo)
    setCurrentPlayer(prev => prev === 1 ? 2 : 1);
  };

  const getPossibleMoves = (pawnId) => {
    if (selectedPawn !== pawnId) return [];
    
    const pawn = pawns.find(p => p.id === pawnId);
    if (!pawn) return [];
    
    try {
      return getValidMoves(pawn, pawns, walls);
    } catch (error) {
      console.error('getPossibleMoves エラー:', error);
      return [];
    }
  };

  const renderWallSlots = () => {
    const slots = [];

    // Wall slots for selected orientation only (reduces hover targets)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (canPlaceWall(row, col, wallOrientation)) {
          slots.push(
            <WallSlot
              key={`${wallOrientation}-${row}-${col}`}
              row={row}
              col={col}
              orientation={wallOrientation}
              onClick={handleWallSlotClick}
              onHover={(isHovering) => {
                setPreviewWall(isHovering ? { row, col, orientation: wallOrientation } : null);
              }}
            />
          );
        }
      }
    }
    
    return slots;
  };

  return (
    <div className="flex flex-col items-center p-4">
      {winner ? (
        <div className="mb-4 p-6 bg-yellow-100 border-2 border-yellow-400 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-yellow-800">
            <div className={`w-6 h-6 rounded-full ${winner === 1 ? 'bg-blue-500' : 'bg-red-500'}`} />
            <span>プレイヤー{winner}の勝利！</span>
          </div>
          <button
            onClick={() => {
              // Reset game
              setPawns([
                { id: 1, row: 0, col: 4, player: 1 },
                { id: 2, row: 8, col: 4, player: 2 }
              ]);
              setWalls([]);
              setWallCounts({ 1: 10, 2: 10 });
              setCurrentPlayer(1);
              setWinner(null);
              setSelectedPawn(null);
            }}
            className="mt-3 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
          >
            新しいゲーム
          </button>
        </div>
      ) : (
        <div className="mb-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-lg font-bold">
            <div className={`w-4 h-4 rounded-full ${currentPlayer === 1 ? 'bg-blue-500' : 'bg-red-500'}`} />
            <span>プレイヤー{currentPlayer}の手番</span>
            {currentRoom && (
              <span className="text-sm text-gray-500">
                （あなたはプレイヤー{playerId}）
              </span>
            )}
          </div>
        
          <div className="flex gap-4">
            <button
              onClick={() => {
                setIsWallMode(!isWallMode);
                setSelectedPawn(null);
                setPreviewWall(null);
              }}
              disabled={currentRoom && playerId !== currentPlayer}
              className={`
                px-6 py-3 rounded-lg font-semibold text-lg
                ${isWallMode 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-700'
                }
                ${currentRoom && playerId !== currentPlayer ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 active:scale-95'}
                transition-all
              `}
            >
              {isWallMode ? '壁配置モード' : '移動モード'}
            </button>
            {isWallMode && (
              <button
                onClick={() => {
                  setWallOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
                  setPreviewWall(null);
                }}
                disabled={currentRoom && playerId !== currentPlayer}
                className={`
                  px-5 py-3 rounded-lg font-semibold text-lg border-2
                  bg-white text-gray-700 border-gray-400
                  ${currentRoom && playerId !== currentPlayer ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 active:scale-95'}
                  transition-all
                `}
                title="壁の向きを切り替え"
              >
                {wallOrientation === 'horizontal' ? '横壁 ―' : '縦壁 |'}
              </button>
            )}
            <div className="flex items-center gap-3 text-lg font-medium text-gray-700">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                {wallCounts[1]}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                {wallCounts[2]}
              </span>
            </div>
          </div>

          {isWallMode && (
            <div className="text-sm text-gray-600">
              壁配置: クリックで設置 / Rで向きを切替 / Escで移動モード
            </div>
          )}
        </div>
      )}
      
      <div className="relative border-2 border-gray-800 bg-amber-100">
        <div className="grid grid-cols-9 gap-0">
          {Array.from({ length: 81 }, (_, i) => {
            const row = Math.floor(i / 9);
            const col = i % 9;
            const pawn = pawns.find(p => p.row === row && p.col === col);
            const isHighlighted = !isWallMode && getPossibleMoves(selectedPawn).some(([r, c]) => r === row && c === col);
            
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
        
        {walls.map(wall => (
          <Wall key={wall.id} wall={wall} />
        ))}

        {previewWall && <Wall wall={previewWall} isPreview />}
        
        {isWallMode && renderWallSlots()}
      </div>
    </div>
  );
}
