import React, { useState, useRef } from 'react';

const ImageEditorModal = ({ imageSrc, onSave, onCancel }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);

  // --- DRAG LOGIC ---
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- SAVE LOGIC ---
  const handleSave = () => {
    const finalStyle = {
      backgroundImage: `url(${imageSrc})`,
      backgroundPosition: `${position.x}px ${position.y}px`,
      backgroundSize: `${zoom * 100}%`,
      transform: `rotate(${rotation}deg)`
    };
    onSave(finalStyle);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3>Adjust Image</h3>
        
        {/* EDITING CANVAS */}
        <div 
          style={canvasContainerStyle}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* The draggable image area */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            style={{
              ...imageAreaStyle,
              backgroundImage: `url(${imageSrc})`,
              backgroundPosition: `${position.x}px ${position.y}px`,
              backgroundSize: `${zoom * 100}%`,
              transform: `rotate(${rotation}deg)`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          />
          {/* The visual "Frame" showing what will be cropped */}
          <div style={frameOverlayStyle} />
        </div>

        {/* CONTROLS */}
        <div style={controlsStyle}>
          <div style={controlRowStyle}>
            <label>Zoom</label>
            <input 
              type="range" min="1" max="5" step="0.1" 
              value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} 
              style={{ width: '100%' }}
            />
          </div>
          <div style={controlRowStyle}>
            <label>Rotate</label>
            {/* CHANGED: step="1" allows smooth rotation */}
            <input 
              type="range" min="0" max="360" step="1" 
              value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} 
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* BUTTONS */}
        <div style={buttonRowStyle}>
          <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleSave} style={saveBtnStyle}>Set Image</button>
        </div>
      </div>
    </div>
  );
};

// --- STYLES ---
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.8)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const modalStyle = {
  background: '#333', color: 'white', padding: '20px',
  borderRadius: '8px', width: '400px',
  display: 'flex', flexDirection: 'column', gap: '20px'
};

const canvasContainerStyle = {
  width: '300px', height: '300px', margin: '0 auto',
  position: 'relative', overflow: 'hidden', background: '#000',
  borderRadius: '4px', border: '1px solid #555'
};

const imageAreaStyle = {
  width: '100%', height: '100%',
  backgroundRepeat: 'no-repeat'
};

const frameOverlayStyle = {
  pointerEvents: 'none',
  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  border: '2px solid rgba(255, 255, 255, 0.5)',
  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
};

const controlsStyle = { display: 'flex', flexDirection: 'column', gap: '10px' };
const controlRowStyle = { display: 'grid', gridTemplateColumns: '60px 1fr', alignItems: 'center', gap: '10px', fontSize: '12px' };

const buttonRowStyle = { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' };

const saveBtnStyle = { background: '#5c8bd6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' };
const cancelBtnStyle = { background: 'transparent', color: '#aaa', border: '1px solid #555', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' };

export default ImageEditorModal;