import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import MenuBar from './MenuBar';
import CommandPalette from './CommandPalette'; // <--- 1. Imported

const Layout = ({ theme, toggleTheme }) => {
  // --- LAYOUT STATE ---
  const [isZenMode, setIsZenMode] = useState(false);
  
  // Panel Visibility
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  // FIXED WIDTHS
  const leftWidth = 220; 
  const rightWidth = 250;

  const toggleZen = () => {
    setIsZenMode(!isZenMode);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)', color: 'var(--text-main)', overflow: 'hidden' }}>
      
      {/* 2. RENDER COMMAND PALETTE (Pass Props) */}
      <CommandPalette toggleTheme={toggleTheme} toggleZenMode={toggleZen} />

      {/* 1. TOP MENU BAR */}
      <MenuBar 
        toggleTheme={toggleTheme} 
        isZenMode={isZenMode} 
        toggleZenMode={toggleZen} 
      />

      {/* 2. TOOLBAR / TOGGLES */}
      {!isZenMode && (
        <div style={subHeaderStyle}>
          <button onClick={() => setShowLeft(!showLeft)} style={toggleBtnStyle} title="Toggle Binder">
            {showLeft ? '◀ Binder' : '▶ Show Binder'}
          </button>
          
          <div style={{flex:1}}></div>
          
          <button onClick={() => setShowRight(!showRight)} style={toggleBtnStyle} title="Toggle Lore Panel">
            {showRight ? 'Lore & Notes ▶' : '◀ Show Lore'}
          </button>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT PANEL WRAPPER */}
        {!isZenMode && showLeft && (
          <div style={{ 
            width: leftWidth, 
            display: 'flex', 
            flexShrink: 0,
            borderRight: '1px solid var(--border)' 
          }}>
            <div style={{ flex: 1, overflow: 'hidden' }}><LeftPanel /></div>
          </div>
        )}

        {/* CENTER STAGE (Editor / Map / Lore Card) */}
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--paper)', minWidth: 0 }}>
          <Outlet /> 
        </main>

        {/* RIGHT PANEL WRAPPER */}
        {!isZenMode && showRight && (
          <div style={{ 
            width: rightWidth, 
            display: 'flex', 
            flexShrink: 0,
            borderLeft: '1px solid var(--border)' 
          }}>
            <div style={{ flex: 1, overflow: 'hidden' }}><RightPanel /></div>
          </div>
        )}
        
      </div>

      {/* 4. STATUS FOOTER */}
      <footer style={styles.footer}>
        <span>Ready.</span>
        <span>Auto-Save: Active</span>
      </footer>
    </div>
  );
};

// --- STYLES ---
const subHeaderStyle = { 
  height: '24px', 
  background: 'var(--bg-panel)', 
  borderBottom: '1px solid var(--border)', 
  display: 'flex', 
  alignItems: 'center', 
  padding: '0 8px',
  flexShrink: 0 
};

const toggleBtnStyle = { 
  background: 'transparent', 
  border: 'none', 
  color: 'var(--text-muted)', 
  fontSize: '10px', 
  cursor: 'pointer', 
  fontWeight: 'bold',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const styles = { 
  footer: { 
    height: '24px', 
    background: 'var(--bg-header)', 
    borderTop: '1px solid var(--border)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '0 15px', 
    fontSize: '11px', 
    color: 'var(--text-muted)',
    flexShrink: 0 
  } 
};

export default Layout;