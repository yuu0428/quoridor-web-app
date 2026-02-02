import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getValidMoves,
  isWallPlacementConflicting
} from '../src/utils/gameLogic.js';

test('getValidMoves: jump over adjacent pawn when possible', () => {
  const pawns = [
    { id: 1, row: 4, col: 4, player: 1 },
    { id: 2, row: 3, col: 4, player: 2 }
  ];

  const moves = getValidMoves(pawns[0], pawns, []);

  assert(moves.some(([r, c]) => r === 2 && c === 4), 'includes straight jump');
  assert(!moves.some(([r, c]) => r === 3 && c === 4), 'does not allow moving onto occupied square');
  assert(!moves.some(([r, c]) => r === 3 && c === 3), 'does not allow diagonal when straight jump is available');
  assert(!moves.some(([r, c]) => r === 3 && c === 5), 'does not allow diagonal when straight jump is available');
});

test('getValidMoves: diagonal moves when jump is blocked', () => {
  const pawns = [
    { id: 1, row: 4, col: 4, player: 1 },
    { id: 2, row: 3, col: 4, player: 2 }
  ];

  // Block the straight jump from (3,4) to (2,4) by placing a horizontal wall.
  const walls = [{ row: 2, col: 4, orientation: 'horizontal' }];

  const moves = getValidMoves(pawns[0], pawns, walls);

  assert(!moves.some(([r, c]) => r === 2 && c === 4), 'does not include straight jump when blocked');
  assert(moves.some(([r, c]) => r === 3 && c === 3), 'includes left diagonal around the pawn');
  assert(moves.some(([r, c]) => r === 3 && c === 5), 'includes right diagonal around the pawn');
});

test('isWallPlacementConflicting: detects half-overlap and crossing', () => {
  const existing = [{ row: 3, col: 3, orientation: 'horizontal' }];

  assert.equal(
    isWallPlacementConflicting(3, 3, 'horizontal', existing),
    true,
    'exact overlap'
  );
  assert.equal(
    isWallPlacementConflicting(3, 4, 'horizontal', existing),
    true,
    'half-overlap (col + 1)'
  );
  assert.equal(
    isWallPlacementConflicting(3, 5, 'horizontal', existing),
    false,
    'non-overlapping (col + 2)'
  );
  assert.equal(
    isWallPlacementConflicting(3, 3, 'vertical', existing),
    true,
    'crossing at same slot'
  );
});

