// Check if there's a wall blocking movement between two cells
export const isWallBlocking = (fromRow, fromCol, toRow, toCol, walls) => {
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  
  // Moving up (row decreases)
  if (rowDiff === -1 && colDiff === 0) {
    return walls.some(wall => 
      wall.orientation === 'horizontal' &&
      wall.row === toRow &&
      (wall.col === fromCol - 1 || wall.col === fromCol)
    );
  }
  
  // Moving down (row increases)
  if (rowDiff === 1 && colDiff === 0) {
    return walls.some(wall => 
      wall.orientation === 'horizontal' &&
      wall.row === fromRow &&
      (wall.col === fromCol - 1 || wall.col === fromCol)
    );
  }
  
  // Moving left (col decreases)
  if (rowDiff === 0 && colDiff === -1) {
    return walls.some(wall => 
      wall.orientation === 'vertical' &&
      wall.col === toCol &&
      (wall.row === fromRow - 1 || wall.row === fromRow)
    );
  }
  
  // Moving right (col increases)
  if (rowDiff === 0 && colDiff === 1) {
    return walls.some(wall => 
      wall.orientation === 'vertical' &&
      wall.col === fromCol &&
      (wall.row === fromRow - 1 || wall.row === fromRow)
    );
  }
  
  return false;
};

export const isWallPlacementConflicting = (row, col, orientation, walls) => {
  return walls.some((wall) => {
    // Same orientation: disallow exact overlap + half-overlap (offset by 1)
    if (wall.orientation === orientation) {
      if (orientation === 'horizontal') {
        return wall.row === row && (wall.col === col || wall.col === col - 1 || wall.col === col + 1);
      }
      return wall.col === col && (wall.row === row || wall.row === row - 1 || wall.row === row + 1);
    }

    // Different orientation: disallow crossing at the same slot
    return wall.row === row && wall.col === col;
  });
};

// Get all valid moves for a pawn (including jumps)
export const getValidMoves = (pawn, pawns, walls) => {
  const moves = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // up, down, left, right
  
  directions.forEach(([dr, dc]) => {
    const newRow = pawn.row + dr;
    const newCol = pawn.col + dc;
    
    // Check if move is within board
    if (newRow < 0 || newRow >= 9 || newCol < 0 || newCol >= 9) return;
    
    // Check if wall blocks this move
    if (isWallBlocking(pawn.row, pawn.col, newRow, newCol, walls)) return;
    
    // Check if another pawn occupies this cell
    const occupyingPawn = pawns.find(p => p.row === newRow && p.col === newCol);
    
    if (!occupyingPawn) {
      // Cell is free, can move there
      moves.push([newRow, newCol]);
    } else {
      // Cell is occupied, check for jump
      const jumpRow = newRow + dr;
      const jumpCol = newCol + dc;
      
      const jumpInBounds = jumpRow >= 0 && jumpRow < 9 && jumpCol >= 0 && jumpCol < 9;
      const jumpBlocked = !jumpInBounds || isWallBlocking(newRow, newCol, jumpRow, jumpCol, walls);

      if (!jumpBlocked) {
        // Check if jump destination is free
        const jumpOccupied = pawns.find(p => p.row === jumpRow && p.col === jumpCol);
        if (!jumpOccupied) {
          moves.push([jumpRow, jumpCol]);
          return;
        }
      }

      // Jump is not possible (edge / wall / occupied) -> diagonal moves
      const diagonals =
        dr !== 0
          ? [[0, -1], [0, 1]] // moving vertically -> can go left/right around the pawn
          : [[-1, 0], [1, 0]]; // moving horizontally -> can go up/down around the pawn

      diagonals.forEach(([pdr, pdc]) => {
        const diagRow = newRow + pdr;
        const diagCol = newCol + pdc;
        if (diagRow < 0 || diagRow >= 9 || diagCol < 0 || diagCol >= 9) return;
        if (isWallBlocking(newRow, newCol, diagRow, diagCol, walls)) return;
        const diagOccupied = pawns.find(p => p.row === diagRow && p.col === diagCol);
        if (!diagOccupied) moves.push([diagRow, diagCol]);
      });
    }
  });
  
  return moves;
};

// Check if a wall placement would block all paths to winning
export const wouldBlockAllPaths = (row, col, orientation, pawns, walls, playerId) => {
  const newWall = { row, col, orientation };
  const testWalls = [...walls, newWall];
  
  const targetPawn = pawns.find(p => p.player === playerId);
  if (!targetPawn) return false;
  
  // Simple BFS to check if path exists to opposite side
  const targetRow = playerId === 1 ? 8 : 0;
  const visited = new Set();
  const queue = [[targetPawn.row, targetPawn.col]];
  
  while (queue.length > 0) {
    const [currentRow, currentCol] = queue.shift();
    const key = `${currentRow},${currentCol}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    // Check if reached target row
    if (currentRow === targetRow) return false;
    
    // Try all directions
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    directions.forEach(([dr, dc]) => {
      const nextRow = currentRow + dr;
      const nextCol = currentCol + dc;
      
      if (nextRow < 0 || nextRow >= 9 || nextCol < 0 || nextCol >= 9) return;
      if (visited.has(`${nextRow},${nextCol}`)) return;
      if (isWallBlocking(currentRow, currentCol, nextRow, nextCol, testWalls)) return;

      queue.push([nextRow, nextCol]);
    });
  }
  
  return true; // No path found
};

// Check win condition
export const checkWinCondition = (pawns) => {
  const player1Pawn = pawns.find(p => p.player === 1);
  const player2Pawn = pawns.find(p => p.player === 2);
  
  if (player1Pawn && player1Pawn.row === 8) return 1;
  if (player2Pawn && player2Pawn.row === 0) return 2;
  
  return null;
};
