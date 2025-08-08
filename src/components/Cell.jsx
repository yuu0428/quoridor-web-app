export default function Cell({ row, col, onClick, isHighlighted, children }) {
  return (
    <div
      className={`
        w-12 h-12 border border-gray-400 flex items-center justify-center cursor-pointer
        ${isHighlighted ? 'bg-green-200 border-green-500' : 'bg-amber-50'}
        hover:bg-amber-100 active:bg-amber-200
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}