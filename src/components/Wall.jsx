export default function Wall({ wall, isPreview = false }) {
  const baseClasses = "absolute bg-gray-800 pointer-events-none";
  const previewClasses = isPreview ? "bg-gray-400 opacity-60" : "";
  
  if (wall.orientation === 'horizontal') {
    return (
      <div 
        className={`${baseClasses} ${previewClasses}`}
        style={{
          width: '96px',
          height: '4px',
          top: `${wall.row * 48 + 48 - 2}px`,
          left: `${wall.col * 48}px`
        }}
      />
    );
  } else {
    return (
      <div 
        className={`${baseClasses} ${previewClasses}`}
        style={{
          width: '4px',
          height: '96px',
          top: `${wall.row * 48}px`,
          left: `${wall.col * 48 + 48 - 2}px`
        }}
      />
    );
  }
}