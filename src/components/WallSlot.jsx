export default function WallSlot({ row, col, orientation, onClick, isPreview }) {
  const handleClick = (e) => {
    e.stopPropagation();
    onClick(row, col, orientation);
  };

  if (orientation === 'horizontal') {
    return (
      <div
        className={`
          absolute w-24 h-3 cursor-pointer z-10
          ${isPreview ? 'bg-gray-400 opacity-60' : 'hover:bg-gray-300 hover:opacity-40'}
        `}
        style={{
          top: `${row * 48 + 48 - 6}px`,
          left: `${col * 48}px`
        }}
        onClick={handleClick}
      />
    );
  } else {
    return (
      <div
        className={`
          absolute w-3 h-24 cursor-pointer z-10
          ${isPreview ? 'bg-gray-400 opacity-60' : 'hover:bg-gray-300 hover:opacity-40'}
        `}
        style={{
          top: `${row * 48}px`,
          left: `${col * 48 + 48 - 6}px`
        }}
        onClick={handleClick}
      />
    );
  }
}