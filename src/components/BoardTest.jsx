import { useState } from 'react';

export default function BoardTest() {
  const [selectedPawn, setSelectedPawn] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [pawns] = useState([
    { id: 1, row: 0, col: 4, player: 1 },
    { id: 2, row: 8, col: 4, player: 2 }
  ]);

  console.log('BoardTest レンダリング中...', { pawns });

  const handleCellClick = (row, col) => {
    console.log('セルクリック:', row, col);
  };

  const handlePawnClick = (pawnId) => {
    console.log('コマクリック:', pawnId);
    const pawn = pawns.find(p => p.id === pawnId);
    
    // 現在のプレイヤーのコマのみ選択可能
    if (pawn.player !== currentPlayer) {
      console.log('自分のコマではありません');
      return;
    }
    
    setSelectedPawn(selectedPawn === pawnId ? null : pawnId);
  };

  // シンプルなCell（インラインスタイル）
  const TestCell = ({ row, col, onClick, children }) => (
    <div
      style={{
        width: '48px',
        height: '48px',
        border: '1px solid #9ca3af',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backgroundColor: '#fffbeb'
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );

  // シンプルなPawn（インラインスタイル）
  const TestPawn = ({ pawn, isSelected, onClick }) => (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        cursor: 'pointer',
        backgroundColor: pawn.player === 1 ? '#3b82f6' : '#ef4444',
        border: isSelected ? '4px solid #facc15' : 'none',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
      <div style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
        プレイヤー{currentPlayer}の手番
      </div>
      
      <div style={{ border: '2px solid #1f2937', backgroundColor: '#f3f0e1', padding: '8px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(9, 1fr)', 
          gap: '0px' 
        }}>
          {Array.from({ length: 81 }, (_, i) => {
            const row = Math.floor(i / 9);
            const col = i % 9;
            const pawn = pawns.find(p => p.row === row && p.col === col);
            
            return (
              <TestCell
                key={`${row}-${col}`}
                row={row}
                col={col}
                onClick={() => handleCellClick(row, col)}
              >
                {pawn && (
                  <TestPawn
                    pawn={pawn}
                    isSelected={selectedPawn === pawn.id}
                    onClick={() => handlePawnClick(pawn.id)}
                  />
                )}
              </TestCell>
            );
          })}
        </div>
      </div>
      
      <div style={{ marginTop: '16px', fontSize: '14px', color: '#4b5563' }}>
        選択中のコマ: {selectedPawn || 'なし'}
      </div>
    </div>
  );
}