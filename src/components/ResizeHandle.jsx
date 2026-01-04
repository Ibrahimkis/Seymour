import React, { useState, useEffect } from 'react';

const ResizeHandle = ({ onResize }) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      onResize(e.movementX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onResize]);

  const startDrag = () => {
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
  };

  return (
    <div 
      onMouseDown={startDrag}
      style={{
        width: '4px',
        cursor: 'col-resize',
        background: isDragging ? 'var(--accent)' : 'transparent',
        borderLeft: '1px solid var(--border)',
        zIndex: 10,
        height: '100%',
        flexShrink: 0,
        transition: 'background 0.2s'
      }}
      className="resize-handle"
    >
      <style>{`.resize-handle:hover { background: var(--accent) !important; }`}</style>
    </div>
  );
};

export default ResizeHandle;