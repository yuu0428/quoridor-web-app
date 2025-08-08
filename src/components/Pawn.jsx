export default function Pawn({ pawn, isSelected, onClick }) {
  const playerColors = {
    1: 'bg-blue-500',
    2: 'bg-red-500'
  };

  return (
    <div
      className={`
        w-8 h-8 rounded-full cursor-pointer transition-all duration-150
        ${playerColors[pawn.player]}
        ${isSelected ? 'ring-4 ring-yellow-400 ring-opacity-70 scale-110' : ''}
        hover:scale-105 active:scale-95
        shadow-md
      `}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    />
  );
}