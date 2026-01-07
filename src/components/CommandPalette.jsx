import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';

const CommandPalette = ({ toggleTheme, toggleZenMode }) => {
  const { projectData, setProjectData } = useProject();
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef(null);

  // --- 1. KEYBOARD LISTENERS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle Open: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      
      if (!isOpen) return;

      // Navigation within Palette
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeResult(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Focus Input on Open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // --- 2. SEARCH ENGINE ---
  useEffect(() => {
    if (!isOpen) return;
    if (!query) {
      // Default State: Show System Commands
      setResults(getDefaultCommands());
      return;
    }

    const q = query.toLowerCase();
    const searchProjects = async () => {
      const allResults = [];

      // A. SEARCH CHAPTERS
      const chapters = projectData.manuscript?.chapters || [];
      chapters.forEach(c => {
        if (c.title.toLowerCase().includes(q)) {
          allResults.push({
            id: c.id, type: 'Chapter', label: c.title, icon: '📄',
            action: () => {
              window.dispatchEvent(new CustomEvent('force-save-all'));
              navigate(`/editor?id=${c.id}`);
            }
          });
        }
      });

      // B. SEARCH LORE (Name + Aliases)
      const chars = projectData.lore?.characters || [];
      chars.forEach(c => {
        const nameMatch = c.name.toLowerCase().includes(q);
        const aliasMatch = c.aliases?.some(a => a.toLowerCase().includes(q));
        
        if (nameMatch || aliasMatch) {
          allResults.push({
            id: c.id, type: 'Lore', label: c.name, icon: '👤',
            sub: aliasMatch ? `Matches alias "${q}"` : null,
            action: () => {
              window.dispatchEvent(new CustomEvent('force-save-all'));
              navigate(`/lore?id=${c.id}`);
            }
          });
        }
      });

      // C. SEARCH MAPS
      // Handle both old object format and new array format for Maps
      const mapsRaw = projectData.worldMap;
      const maps = Array.isArray(mapsRaw) ? mapsRaw : (mapsRaw ? [mapsRaw] : []);
      maps.forEach(m => {
        const mapName = m.name || 'Global Map';
        if (mapName.toLowerCase().includes(q)) {
          allResults.push({
            id: m.id || 'default', type: 'Map', label: mapName, icon: '🗺️',
            action: () => {
              window.dispatchEvent(new CustomEvent('force-save-all'));
              navigate('/map');
            }
          });
        }
      });

      // D. LOAD RECENT PROJECTS FROM ELECTRON (if in Electron)
      if (window.electronAPI && q.includes('switch')) {
        try {
          const result = await window.electronAPI.listProjects();
          if (result.success && result.projects) {
            result.projects.slice(0, 5).forEach(proj => {
              allResults.push({
                id: proj.id,
                type: 'Project',
                label: proj.title,
                icon: '📁',
                sub: `Last modified: ${new Date(proj.lastModified).toLocaleDateString()}`,
                action: () => loadProject(proj.id)
              });
            });
          }
        } catch (err) {
          console.error('Failed to load projects:', err);
        }
      }

      // E. SYSTEM COMMANDS (Filter)
      getDefaultCommands().forEach(cmd => {
        if (cmd.label.toLowerCase().includes(q)) {
          allResults.push(cmd);
        }
      });

      setResults(allResults.slice(0, 10)); // Limit to top 10
      setSelectedIndex(0);
    };

    searchProjects();

  }, [query, isOpen, projectData]);

  // --- HELPERS ---
  const loadProject = async (projectId) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.loadProjectFile(projectId);
      if (result.success) {
        setProjectData(result.data);
        navigate('/lore');
        setIsOpen(false);
      }
    }
  };

  const getDefaultCommands = () => {
    const commands = [
      { type: 'Action', label: 'Toggle Dark/Light Mode', icon: '🌗', action: toggleTheme },
      { type: 'Action', label: 'Toggle Zen Mode', icon: '🧘', action: toggleZenMode },
      { type: 'Nav', label: 'Go to Timeline', icon: '⏳', action: () => { window.dispatchEvent(new CustomEvent('force-save-all')); navigate('/timeline'); } },
      { type: 'Nav', label: 'Go to The Web', icon: '🕸️', action: () => { window.dispatchEvent(new CustomEvent('force-save-all')); navigate('/web'); } },
      { type: 'Nav', label: 'Go to Scratchpad', icon: '📓', action: () => { window.dispatchEvent(new CustomEvent('force-save-all')); navigate('/scratchpad'); } },
    ];
    
    if (window.electronAPI) {
      commands.unshift({ 
        type: 'Action', 
        label: 'Switch Project', 
        icon: '🔄', 
        action: () => setQuery('switch '),
        sub: 'Type "switch" to see recent projects'
      });
    }
    
    return commands;
  };

  const executeResult = (item) => {
    if (item && item.action) {
      item.action();
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={() => setIsOpen(false)}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        
        {/* INPUT */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ marginRight: '10px', fontSize: '16px' }}>🔍</span>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Type a command or search..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={inputStyle}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px' }}>ESC</span>
        </div>

        {/* RESULTS LIST */}
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px 0' }}>
          {results.map((item, index) => (
            <div 
              key={index}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => executeResult(item)}
              style={{
                ...resultRowStyle,
                background: index === selectedIndex ? 'var(--accent)' : 'transparent',
                color: index === selectedIndex ? '#fff' : 'var(--text-main)'
              }}
            >
              <div style={{ width: '24px', textAlign: 'center', marginRight: '10px' }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.label}</div>
                {item.sub && <div style={{ fontSize: '11px', opacity: 0.8 }}>{item.sub}</div>}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.6, textTransform: 'uppercase' }}>{item.type}</div>
            </div>
          ))}
          {results.length === 0 && (
            <div style={{ padding: '15px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No results found.
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={footerStyle}>
          <span>Use <b>↑</b> <b>↓</b> to navigate</span>
          <span><b>Enter</b> to select</span>
        </div>

      </div>
    </div>
  );
};

// --- STYLES ---
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
  zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
  paddingTop: '15vh'
};

const modalStyle = {
  width: '600px', maxWidth: '90%',
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden'
};

const inputStyle = {
  flex: 1, background: 'transparent', border: 'none',
  fontSize: '18px', color: 'var(--text-main)', outline: 'none'
};

const resultRowStyle = {
  padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center',
  borderLeft: '2px solid transparent'
};

const footerStyle = {
  padding: '8px 16px', background: 'var(--bg-header)', borderTop: '1px solid var(--border)',
  display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '10px'
};

export default CommandPalette;