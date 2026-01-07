import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import MenuBar from './MenuBar';
import CommandPalette from './CommandPalette'; // <--- 1. Imported
import UniversalSearch from './UniversalSearch';
import SaveReminder from './SaveReminder';
import { useProject } from '../context/ProjectContext';
import packageJson from '../../package.json';

const Layout = ({ theme, toggleTheme }) => {
  // --- LAYOUT STATE ---
  const [isZenMode, setIsZenMode] = useState(false);
  
  // Panel Visibility
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  // Save Reminder
  const [showSaveReminder, setShowSaveReminder] = useState(false);

  // Universal Search
  const [showUniversalSearch, setShowUniversalSearch] = useState(false);

  // FIXED WIDTHS
  const leftWidth = 220; 
  const rightWidth = 250;

  const { saveToDisk, saveToCurrentPath, saveStatus, autoSaveEnabled, projectFilePath, projectId } = useProject();

  // Save reminder timer (1 hour)
  useEffect(() => {
    const oneHour = 60 * 60 * 1000; // 3600000ms
    
    const timer = setTimeout(() => {
      setShowSaveReminder(true);
    }, oneHour);

    return () => clearTimeout(timer);
  }, []);

  const toggleZen = () => {
    setIsZenMode(!isZenMode);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+B - Toggle Binder
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setShowLeft(prev => !prev);
      }
      // Ctrl+L - Toggle Lore Panel
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        setShowRight(prev => !prev);
      }
      // Ctrl+K - Universal Search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowUniversalSearch(true);
      }
      // Ctrl+S - Manual Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveToCurrentPath();
      }
      // Ctrl+F - Focus search (will be handled by individual panels)
      // Ctrl+N - New chapter (will be handled by LeftPanel)
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveToCurrentPath]);

  // Menu IPC handlers for native Electron menu
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMenuToggleTheme(() => {
        toggleTheme();
      });

      window.electronAPI.onMenuZenMode(() => {
        toggleZen();
      });

      // Find functionality - could focus a search input or open command palette
      window.electronAPI.onMenuFind(() => {
        // For now, just log - could be enhanced to focus search
        console.log('Find activated from menu');
      });

      // Export functionality - now handled directly in main process
      // window.electronAPI.onMenuExport(() => {
      //   saveToDisk();
      // });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-toggle-theme');
        window.electronAPI.removeAllListeners('menu-zen-mode');
        window.electronAPI.removeAllListeners('menu-find');
        // Removed: window.electronAPI.removeAllListeners('menu-export');
      }
    };
  }, [toggleTheme]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)', color: 'var(--text-main)', overflow: 'hidden' }}>
      
      {/* COMMAND PALETTE */}
      <CommandPalette toggleTheme={toggleTheme} toggleZenMode={toggleZen} />

      {/* UNIVERSAL SEARCH (Ctrl+K) */}
      <UniversalSearch isOpen={showUniversalSearch} onClose={() => setShowUniversalSearch(false)} />

      {/* 1. TOP MENU BAR */}
      <MenuBar 
        toggleTheme={toggleTheme} 
        isZenMode={isZenMode} 
        toggleZenMode={toggleZen}
        onOpenSearch={() => setShowUniversalSearch(true)}
      />

      {/* 2. TOOLBAR / TOGGLES */}
      {!isZenMode && (
        <div style={subHeaderStyle}>
          <button onClick={() => setShowLeft(!showLeft)} style={toggleBtnStyle} title="Toggle Binder (Ctrl+B)">
            {showLeft ? '◀ Binder' : '▶ Show Binder'}
          </button>
          
          <div style={{flex:1}}></div>
          
          <button onClick={() => setShowRight(!showRight)} style={toggleBtnStyle} title="Toggle Lore Panel (Ctrl+L)">
            {showRight ? 'Lore & Notes ▶' : '◀ Show Lore'}
          </button>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT PANEL WRAPPER */}
        {!isZenMode && (
          <div style={{ 
            width: showLeft ? leftWidth : 0, 
            display: 'flex', 
            flexShrink: 0,
            borderRight: showLeft ? '1px solid var(--border)' : 'none',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden'
          }}>
            <div style={{ flex: 1, overflow: 'hidden', width: leftWidth }}><LeftPanel /></div>
          </div>
        )}

        {/* CENTER STAGE (Editor / Map / Lore Card) */}
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--paper)', minWidth: 0 }}>
          <Outlet /> 
        </main>

        {/* RIGHT PANEL WRAPPER */}
        {!isZenMode && (
          <div style={{ 
            width: showRight ? rightWidth : 0, 
            display: 'flex', 
            flexShrink: 0,
            borderLeft: showRight ? '1px solid var(--border)' : 'none',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden'
          }}>
            <div style={{ flex: 1, overflow: 'hidden', width: rightWidth }}><RightPanel /></div>
          </div>
        )}

      {/* SAVE REMINDER NOTIFICATION */}
      {showSaveReminder && (
        <SaveReminder
          onSave={() => {
            saveToCurrentPath();
            setShowSaveReminder(false);
          }}
          onSaveAs={() => {
            saveToDisk(); // This will open the Save As dialog
            setShowSaveReminder(false);
          }}
          onDismiss={() => {
            setShowSaveReminder(false);
            // Set reminder to show again in 30 minutes
            setTimeout(() => {
              setShowSaveReminder(true);
            }, 30 * 60 * 1000); // 1800000ms
          }}
        />
      )}
        
      </div>

      {/* 4. STATUS FOOTER */}
      <footer style={styles.footer}>
        <span>Seymour v{packageJson.version}</span>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <span title={projectFilePath || `Project ID: ${projectId}`} style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--text-muted)' }}>
            📁 {projectFilePath || `[${projectId}]`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span>Auto-Save: {autoSaveEnabled ? 'Active' : 'Inactive'}</span>
          <span style={{ color: saveStatus === 'Saved' ? 'var(--text-muted)' : 'var(--accent)' }}>{saveStatus}</span>
        </div>
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