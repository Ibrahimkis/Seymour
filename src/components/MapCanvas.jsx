import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';

// --- COLORS ---
const COLORS = [
  { id: 'blue', val: 'var(--accent)', title: 'Blue' },
  { id: 'red', val: '#e74c3c', title: 'Red' },
  { id: 'green', val: '#2ecc71', title: 'Green' },
  { id: 'gold', val: '#f1c40f', title: 'Gold' },
  { id: 'purple', val: '#9b59b6', title: 'Purple' },
  { id: 'orange', val: '#e67e22', title: 'Orange' },
  { id: 'teal', val: '#1abc9c', title: 'Teal' },
  { id: 'pink', val: '#e91e63', title: 'Pink' },
  { id: 'brown', val: '#795548', title: 'Brown' },
  { id: 'lime', val: '#cddc39', title: 'Lime' },
  { id: 'white', val: '#ffffff', title: 'White' },
  { id: 'black', val: '#222222', title: 'Black' },
];

const CLUSTER_DIST = 5;

// --- OPTIMIZED CLUSTERING ALGORITHM ---
// Uses spatial grid for O(n) instead of O(n²)
const clusterPins = (pins, scale) => {
  if (!pins || pins.length === 0) return [];
  
  const threshold = CLUSTER_DIST / scale;
  const gridSize = threshold * 2; // Grid cell size
  const grid = new Map(); // Spatial hash grid
  
  // Helper: Get grid cell key
  const getCell = (x, y) => {
    const cellX = Math.floor(x / gridSize);
    const cellY = Math.floor(y / gridSize);
    return `${cellX},${cellY}`;
  };
  
  // Helper: Get neighboring cells (9 cells including current)
  const getNeighborCells = (x, y) => {
    const cellX = Math.floor(x / gridSize);
    const cellY = Math.floor(y / gridSize);
    const cells = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        cells.push(`${cellX + dx},${cellY + dy}`);
      }
    }
    return cells;
  };
  
  // Add all pins to grid
  pins.forEach((pin, index) => {
    const cell = getCell(pin.x, pin.y);
    if (!grid.has(cell)) grid.set(cell, []);
    grid.get(cell).push({ ...pin, originalIndex: index, clustered: false });
  });
  
  const clusters = [];
  
  // Process each pin
  pins.forEach((pin, index) => {
    const neighborCells = getNeighborCells(pin.x, pin.y);
    let currentCluster = null;
    
    // Check all pins in neighboring cells
    for (const cellKey of neighborCells) {
      const cellPins = grid.get(cellKey);
      if (!cellPins) continue;
      
      for (const otherPin of cellPins) {
        if (otherPin.clustered) continue;
        
        // Calculate distance
        const dx = pin.x - otherPin.x;
        const dy = pin.y - otherPin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < threshold) {
          if (!currentCluster) {
            currentCluster = [otherPin];
            otherPin.clustered = true;
          } else if (!otherPin.clustered) {
            currentCluster.push(otherPin);
            otherPin.clustered = true;
          }
        }
      }
    }
    
    if (currentCluster && currentCluster.length > 0) {
      clusters.push(currentCluster);
    }
  });
  
  // Add unclustered pins as single-pin clusters
  pins.forEach((pin, index) => {
    const cell = getCell(pin.x, pin.y);
    const cellPins = grid.get(cell);
    const pinData = cellPins?.find(p => p.originalIndex === index);
    
    if (pinData && !pinData.clustered) {
      clusters.push([{ ...pin, originalIndex: index }]);
    }
  });
  
  return clusters;
};

const MapCanvas = ({ mapImage, pins = [], onAddPin, onRemovePin, onPinClick, allEntities }) => {
  const containerRef = useRef(null);
  
  // --- STATE ---
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [tempPin, setTempPin] = useState(null);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].val);
  const [highlightedPinId, setHighlightedPinId] = useState(null);

  // --- OPTIMIZED CLUSTERING with useMemo ---
  const clusters = useMemo(() => {
    return clusterPins(pins, scale);
  }, [pins, scale]);

  // --- MEMOIZED GROUP PINS FOR KEY LOG ---
  const groupedPins = useMemo(() => {
    const groups = {};
    pins.forEach(pin => {
      const colorKey = pin.color || 'var(--accent)';
      if (!groups[colorKey]) groups[colorKey] = [];
      const entity = allEntities.find(e => e.id == pin.linkedId);
      groups[colorKey].push({ ...pin, name: entity ? entity.name : 'Unknown Location' });
    });
    return groups;
  }, [pins, allEntities]);

  // --- ZOOM HELPER ---
  const performZoom = useCallback((newScale, focalPoint) => {
    const clampedScale = Math.min(Math.max(1, newScale), 10);
    if (clampedScale === scale) return;

    const scaleRatio = clampedScale / scale;
    const newPanX = focalPoint.x - (focalPoint.x - pan.x) * scaleRatio;
    const newPanY = focalPoint.y - (focalPoint.y - pan.y) * scaleRatio;

    if (clampedScale === 1) setPan({ x: 0, y: 0 });
    else setPan({ x: newPanX, y: newPanY });
    
    setScale(clampedScale);
  }, [scale, pan]);

  // --- WHEEL HANDLER (Throttled for performance) ---
  const lastWheelTime = useRef(0);
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Throttle to max 60fps
      const now = Date.now();
      if (now - lastWheelTime.current < 16) return;
      lastWheelTime.current = now;
      
      const rect = node.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomIntensity = 0.1;
      const direction = e.deltaY > 0 ? -1 : 1;
      const newScale = scale + (direction * zoomIntensity * scale);
      performZoom(newScale, { x: mouseX, y: mouseY });
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [scale, performZoom]);

  // --- MOUSE HANDLERS ---
  const handleZoomBtn = (direction) => {
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newScale = scale + (direction * 0.5);
    performZoom(newScale, { x: centerX, y: centerY });
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.pin-wrapper') || e.target.closest('.map-modal') || e.target.closest('.key-log')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleMapDoubleClick = (e) => {
    if (!mapImage || isSelecting) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const xWithPan = clickX - pan.x;
    const yWithPan = clickY - pan.y;
    const xPercent = (xWithPan / (rect.width * scale)) * 100;
    const yPercent = (yWithPan / (rect.height * scale)) * 100;

    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;

    setTempPin({ x: xPercent, y: yPercent });
    setIsSelecting(true);
    setSelectedEntityId("");
    setSelectedColor(COLORS[0].val);
  };

  const confirmPin = () => {
    if (!selectedEntityId) return;
    onAddPin({ ...tempPin, linkedId: selectedEntityId, color: selectedColor, id: Date.now() });
    setIsSelecting(false);
    setTempPin(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflowY: 'auto' }}>
      
      {/* 1. KEY LOG (Top) */}
      <div style={keyLogContainerStyle} className="key-log custom-scrollbar" onWheel={(e) => e.stopPropagation()}>
        <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '1px', borderBottom:'1px solid #333', paddingBottom:'5px', position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 10 }}>
          MAP KEY (Grouped by Color) • {pins.length} pins
        </div>
        
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignContent: 'flex-start' }}>
          {Object.entries(groupedPins).map(([color, groupPins]) => {
            const colorName = COLORS.find(c => c.val === color)?.title || 'Custom';
            return (
              <div key={color} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '100px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }}></div>
                  <span style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>{colorName}</span>
                </div>
                {groupPins.map((pin, i) => (
                  <div 
                    key={i}
                    onMouseEnter={() => setHighlightedPinId(pin.id)}
                    onMouseLeave={() => setHighlightedPinId(null)}
                    onClick={() => onPinClick(pin.linkedId)}
                    style={{ 
                      fontSize: '12px', 
                      color: highlightedPinId === pin.id ? 'var(--accent)' : 'var(--text-main)', 
                      cursor: 'pointer', 
                      paddingLeft: '14px',
                      fontWeight: highlightedPinId === pin.id ? 'bold' : 'normal',
                      textDecoration: highlightedPinId === pin.id ? 'underline' : 'none',
                      transition: 'color 0.1s'
                    }}
                  >
                    {pin.name}
                  </div>
                ))}
              </div>
            );
          })}
          {pins.length === 0 && <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic' }}>Double click map below to add pins.</div>}
        </div>
      </div>

      {/* 2. MAP VIEWPORT */}
      <div 
        style={{ height: '70vh', minHeight: '500px', flexShrink: 0, overflow: 'hidden', background: '#111', position: 'relative' }}
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleMapDoubleClick}
      >
        <div style={controlsStyle}>
          <button onClick={() => handleZoomBtn(1)} style={zoomBtnStyle}>+</button>
          <div style={{background: '#222', padding: '5px 10px', fontSize: '12px'}}>{Math.round(scale * 100)}%</div>
          <button onClick={() => handleZoomBtn(-1)} style={zoomBtnStyle}>-</button>
          <button onClick={() => { setScale(1); setPan({x:0, y:0}); }} style={{...zoomBtnStyle, width: 'auto', padding: '0 8px'}}>Reset</button>
        </div>

        <div 
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            width: '100%', height: '100%',
            cursor: isDragging ? 'grabbing' : 'crosshair',
            willChange: 'transform' // GPU acceleration hint
          }}
        >
          {mapImage ? (
            <img src={mapImage} alt="Map" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} draggable={false} />
          ) : (
            <div style={{ color: '#666', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Upload Map to Begin</div>
          )}

          {/* RENDER CLUSTERS */}
          {clusters.map((cluster, cIndex) => {
            const x = cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length;
            const y = cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length;
            
            const containsHighlight = cluster.some(p => p.id === highlightedPinId);
            const isCluster = cluster.length > 1;

            if (isCluster) {
              return (
                <div 
                  key={`cluster-${cIndex}`}
                  className="cluster-wrapper"
                  style={{
                    ...pinWrapperStyle,
                    left: `${x}%`, top: `${y}%`,
                    transform: `translate(-50%, -50%) scale(${1 / scale})`,
                    zIndex: containsHighlight ? 200 : 50
                  }}
                >
                  <div 
                    style={{
                      ...clusterBubbleStyle,
                      border: containsHighlight ? '3px solid #f1c40f' : '2px solid var(--accent)',
                      background: containsHighlight ? '#222' : 'rgba(255, 255, 255, 0.9)',
                      color: containsHighlight ? '#f1c40f' : 'black',
                      boxShadow: containsHighlight ? '0 0 15px #f1c40f' : '0 4px 10px rgba(0,0,0,0.5)',
                      transform: containsHighlight ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {cluster.length}
                  </div>
                </div>
              );
            }

            // SINGLE PIN
            const pin = cluster[0];
            const entity = allEntities.find(e => e.id == pin.linkedId);
            const isHighlighted = highlightedPinId === pin.id;

            return (
              <div 
                key={`pin-${pin.originalIndex}`}
                className="pin-wrapper"
                title={entity?.name}
                style={{
                  ...pinWrapperStyle,
                  left: `${pin.x}%`, top: `${pin.y}%`,
                  transform: `translate(-50%, -50%) scale(${1 / scale})`,
                  zIndex: isHighlighted ? 100 : 10
                }}
              >
                <div 
                  onClick={(e) => { e.stopPropagation(); onPinClick(pin.linkedId); }}
                  style={{
                    width: isHighlighted ? '28px' : '18px', 
                    height: isHighlighted ? '28px' : '18px',
                    background: pin.color || 'var(--accent)',
                    borderRadius: '50%', border: '2px solid white',
                    boxShadow: isHighlighted ? '0 0 0 4px white, 0 0 20px black' : '0 2px 5px black',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                />
                {isHighlighted && <div style={floatingLabelStyle}>{entity?.name}</div>}
                <button onClick={(e) => { e.stopPropagation(); onRemovePin(pin.originalIndex); }} className="pin-delete" style={singleDeleteStyle}>×</button>
              </div>
            );
          })}
        </div>

        {/* MODAL */}
        {isSelecting && (
          <div style={modalOverlayStyle} className="map-modal">
            <div style={modalBoxStyle}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-main)' }}>Add Pin</div>
              <div style={{marginBottom: '10px'}}>
                <label style={{fontSize: '11px', color: 'var(--text-muted)'}}>LINK TO:</label>
                <select value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value)} style={inputStyle}>
                  <option value="" disabled>Select Entity...</option>
                  {allEntities.map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                </select>
              </div>
              <div style={{marginBottom: '15px'}}>
                <label style={{fontSize: '11px', color: 'var(--text-muted)'}}>COLOR:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                  {COLORS.map(c => (
                    <div key={c.id} title={c.title} onClick={() => setSelectedColor(c.val)}
                      style={{ width: '20px', height: '20px', borderRadius: '50%', background: c.val, cursor: 'pointer', border: selectedColor === c.val ? '2px solid white' : '1px solid #555', boxShadow: selectedColor === c.val ? '0 0 0 2px var(--accent)' : 'none' }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsSelecting(false)} style={cancelBtnStyle}>Cancel</button>
                <button onClick={confirmPin} disabled={!selectedEntityId} style={confirmBtnStyle}>Add Pin</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. SCROLL CUSHION */}
      <div style={{ height: '120px', flexShrink: 0 }}></div>

      <style>{`
        .pin-wrapper:hover .pin-delete { display: flex !important; }
        .cluster-wrapper:hover { z-index: 100 !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #111; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; borderRadius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #666; }
      `}</style>
    </div>
  );
};

// --- STYLES ---
const controlsStyle = { position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '5px', zIndex: 50, background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '4px' };
const zoomBtnStyle = { background: '#333', color: 'white', border: '1px solid #555', width: '25px', height: '25px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const pinWrapperStyle = { position: 'absolute', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 };
const singleDeleteStyle = { position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', border: '1px solid white', cursor: 'pointer', display: 'none', alignItems: 'center', justifyContent: 'center', padding: 0 };
const clusterBubbleStyle = { width: '30px', height: '30px', background: 'rgba(255, 255, 255, 0.9)', color: 'black', borderRadius: '50%', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', cursor: 'pointer' };
const modalOverlayStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const modalBoxStyle = { background: 'var(--bg-panel)', padding: '20px', border: '1px solid var(--border)', boxShadow: '0 5px 20px black', borderRadius: '8px', minWidth: '250px' };
const inputStyle = { width: '100%', padding: '5px', marginTop: '5px', background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border)' };
const cancelBtnStyle = { flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '4px' };
const confirmBtnStyle = { flex: 1, background: 'var(--accent)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px', borderRadius: '4px', fontWeight: 'bold' };

const keyLogContainerStyle = {
  minHeight: '120px',
  background: 'var(--bg-panel)', 
  borderBottom: '2px solid var(--border)', 
  padding: '15px 20px', 
  flexShrink: 0, 
  zIndex: 60,
  position: 'relative' 
};

const floatingLabelStyle = {
  position: 'absolute', top: '-35px', left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(0,0,0,0.9)', color: 'white', padding: '4px 10px', borderRadius: '4px',
  fontSize: '12px', whiteSpace: 'nowrap', pointerEvents: 'none',
  border: '1px solid var(--accent)', boxShadow: '0 4px 10px black',
  zIndex: 200
};

export default MapCanvas;