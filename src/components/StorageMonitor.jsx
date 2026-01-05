// Create: src/components/StorageMonitor.jsx
// Add this to your MenuBar or Footer to show storage usage

import React, { useState, useEffect } from 'react';
import { getStorageInfo } from '../utils/imageCompression';

const StorageMonitor = () => {
  const [storageInfo, setStorageInfo] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    const updateStorage = () => {
      const info = getStorageInfo();
      setStorageInfo(info);
    };
    
    updateStorage();
    const interval = setInterval(updateStorage, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  if (!storageInfo) return null;
  
  const percentage = parseFloat(storageInfo.percentage);
  const isWarning = percentage > 70;
  const isCritical = percentage > 90;
  
  return (
    <div 
      style={containerStyle}
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      {/* Storage Bar */}
      <div style={barContainerStyle}>
        <div 
          style={{
            ...barFillStyle,
            width: storageInfo.percentage,
            background: isCritical ? '#e74c3c' : isWarning ? '#f1c40f' : '#2ecc71'
          }}
        />
      </div>
      
      {/* Label */}
      <span style={{
        fontSize: '10px',
        color: isCritical ? '#e74c3c' : isWarning ? '#f1c40f' : '#888',
        marginLeft: '5px'
      }}>
        {storageInfo.percentage}
      </span>
      
      {/* Tooltip on Hover */}
      {showDetails && (
        <div style={tooltipStyle}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Storage Usage</div>
          <div>Used: {storageInfo.used}</div>
          <div>Total: ~{storageInfo.total}</div>
          {isWarning && (
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#f1c40f', borderTop: '1px solid #333', paddingTop: '5px' }}>
              ⚠️ Running low on space. Consider exporting your project and removing unused images.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  position: 'relative',
  cursor: 'help'
};

const barContainerStyle = {
  width: '60px',
  height: '4px',
  background: '#222',
  borderRadius: '2px',
  overflow: 'hidden',
  border: '1px solid #333'
};

const barFillStyle = {
  height: '100%',
  transition: 'width 0.3s ease, background 0.3s ease'
};

const tooltipStyle = {
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '4px',
  padding: '8px 12px',
  fontSize: '11px',
  color: '#ccc',
  whiteSpace: 'nowrap',
  marginBottom: '5px',
  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
  zIndex: 10000
};

export default StorageMonitor;
