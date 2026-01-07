import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Needed to reset view on New Project
import { useProject } from '../context/ProjectContext';
import { dbSet } from '../context/projectDb'; // For manual save before reload
import CompileModal from './CompileModal';
import ExportLoreModal from './ExportLoreModal';
import CustomModal from './CustomModal'; // <--- We need the modal for New/Save As
import packageJson from '../../package.json';

// --- DEFAULT EMPTY STATE ---
const EMPTY_PROJECT = {
  title: "Untitled Project",
  manuscript: {
    chapters: [
      { id: 1, title: "Chapter 1", content: "<p>Once upon a time...</p>" }
    ]
  },
  lore: {
    characters: [],
    folders: [
      { id: 'root_char', name: 'Characters', parentId: null, isOpen: true },
      { id: 'root_loc', name: 'Locations', parentId: null, isOpen: true },
      { id: 'root_misc', name: 'Unsorted', parentId: null, isOpen: true },
    ]
  },
  worldMap: { imageSrc: null, pins: [] }
};

const MenuBar = ({ toggleTheme, isZenMode, toggleZenMode, onOpenSearch }) => {
  const { projectData, setProjectData, setProjectId, setProjectFilePath, saveToCurrentPath, saveToDisk } = useProject();
  const navigate = useNavigate();

  const inferProjectTitle = (existingTitle, filePath, fallbackProjectId) => {
    const normalizedExisting = typeof existingTitle === 'string' ? existingTitle.trim() : '';
    if (normalizedExisting && normalizedExisting.toLowerCase() !== 'untitled project') return normalizedExisting;

    if (filePath && typeof filePath === 'string') {
      const base = filePath.split(/[\\/]/).pop() || '';
      const withoutExt = base.replace(/\.(json|seymour)$/i, '').trim();
      if (withoutExt) return withoutExt;
    }

    if (fallbackProjectId && typeof fallbackProjectId === 'string') {
      const fromId = fallbackProjectId
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
      if (fromId) return fromId;
    }

    return 'Untitled Project';
  };
  
  // --- STATE ---
  const [activeMenu, setActiveMenu] = useState(null);
  const [showCompile, setShowCompile] = useState(false);
  const [showExportLore, setShowExportLore] = useState(false);
  const [showAutoSaveWarning, setShowAutoSaveWarning] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved === null || saved === 'true';
  });
  
  // Modal State for New/Save As
  const [modal, setModal] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  const menuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- FILE ACTIONS ---

  // 1. NEW PROJECT
  const handleNewProject = () => {
    setActiveMenu(null);
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Create New Project?',
      message: '⚠️ Warning: Any unsaved changes to the current project will be lost. Make sure to Save first.',
      onConfirm: () => {
        setProjectData(EMPTY_PROJECT); // Reset Data
        navigate('/'); // Go to dashboard
        closeModal();
      }
    });
  };

  // 1b. SWITCH PROJECT (Electron only)
  const handleSwitchProject = async () => {
    setActiveMenu(null);
    if (!window.electronAPI) return;
    
    const result = await window.electronAPI.listProjects();
    if (!result.success || !result.projects || result.projects.length === 0) {
      setModal({
        isOpen: true,
        type: 'confirm',
        title: 'No Projects',
        message: 'No projects found.',
        onConfirm: closeModal
      });
      return;
    }
    
    setModal({
      isOpen: true,
      type: 'projectList',
      title: 'Switch Project',
      message: 'Select a project to open:',
      projects: result.projects,
      onConfirm: async (projectId) => {
        const loadResult = await window.electronAPI.loadProjectFile(projectId);
        if (loadResult.success) {
          const inferredTitle = inferProjectTitle(loadResult.data?.title, loadResult.filePath || null, projectId);
          setProjectData({ ...loadResult.data, title: inferredTitle });
          setProjectId(projectId);
          setProjectFilePath(loadResult.filePath || null);
          navigate('/lore');
        }
        closeModal();
      }
    });
  };

  // 2. SAVE (Quick)
  const handleSave = async () => {
    await saveToCurrentPath();
    setActiveMenu(null);
  };

  // 3. SAVE AS (Rename & Save)
  const handleSaveAs = async () => {
    await saveToDisk();
    setActiveMenu(null);
  };

  // Helper: Actual download logic
  const downloadProject = (data, filename) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${filename}.seymour`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // 4. LOAD
  const handleLoadElectron = async () => {
    if (!window.electronAPI?.openProjectDialog) return;
    setActiveMenu(null);

    const result = await window.electronAPI.openProjectDialog();
    if (result.success && result.data) {
      try {
        const json = JSON.parse(result.data);
        json.title = inferProjectTitle(json.title, result.filePath, null);

        // Extract filename and projectId
        const fileName = result.filePath.split(/[\\/]/).pop();
        const newProjectId = fileName.replace(/\.(json|seymour)$/i, '').replace(/[^a-z0-9]/gi, '-').toLowerCase();

        setProjectData(json);
        setProjectId(newProjectId);
        setProjectFilePath(result.filePath);
        console.log(`✅ Loaded project from: ${result.filePath}`);
        navigate('/lore');
      } catch (err) {
        console.error('Failed to load project:', err);
      }
    }
  };

  const handleLoadWeb = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        json.title = inferProjectTitle(json.title, null, file.name.replace(/\.(json|seymour)$/i, ''));
        setProjectData(json);
        setModal({
          isOpen: true,
          type: 'confirm',
          title: 'Success',
          message: 'Project Loaded Successfully!',
          onConfirm: () => {
            closeModal();
            navigate('/'); // Go home after load
          }
        });
      } catch (err) {
        setModal({
          isOpen: true,
          type: 'confirm',
          title: 'Load Error',
          message: 'Failed to load project file. It might be corrupted.',
          onConfirm: closeModal
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setActiveMenu(null);
  };

  // --- RENDER HELPERS ---
  const Menu = ({ label, name, children }) => (
    <div style={{ position: 'relative' }}>
      <div 
        onClick={() => setActiveMenu(activeMenu === name ? null : name)}
        style={{ ...menuItemStyle, background: activeMenu === name ? 'rgba(255,255,255,0.1)' : 'transparent' }}
      >
        {label}
      </div>
      {activeMenu === name && (
        <div style={dropdownStyle}>
          {children}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* GLOBAL MODALS */}
      <CompileModal isOpen={showCompile} onClose={() => setShowCompile(false)} />
      <ExportLoreModal isOpen={showExportLore} onClose={() => setShowExportLore(false)} />
      
      <CustomModal 
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        defaultValue={modal.defaultValue}
        projects={modal.projects}
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
      />

      <div ref={menuRef} style={barStyle}>
        {/* APP TITLE / LOGO */}
        <div style={{ fontWeight: 'bold', marginRight: '20px', color: 'var(--accent)', letterSpacing: '1px' }}>
          SEYMOUR
          {/* Show current project title if available */}
          {projectData?.title && <span style={{fontWeight: 'normal', color: '#666', fontSize: '12px', marginLeft: '10px'}}>— {projectData.title}</span>}
        </div>

        {/* MENUS */}
        <div style={{ display: 'flex' }}>
          
          <Menu label="File" name="file">
            <button style={dropdownItemStyle} onClick={handleNewProject}>📄 New Project</button>
            {window.electronAPI && (
              <button style={dropdownItemStyle} onClick={handleSwitchProject}>🔄 Switch Project...</button>
            )}
            <div style={{height: 1, background: '#444', margin: '5px 0'}}></div>

            {window.electronAPI?.openProjectDialog ? (
              <button style={dropdownItemStyle} onClick={handleLoadElectron}>📂 Load Project...</button>
            ) : (
              <label style={dropdownItemStyle}>
                📂 Load Project...
                <input type="file" accept=".seymour,.json" onChange={handleLoadWeb} style={{ display: 'none' }} />
              </label>
            )}
            
            <div style={{height: 1, background: '#444', margin: '5px 0'}}></div>
            <button style={dropdownItemStyle} onClick={handleSave}>💾 Save</button>
            <button style={dropdownItemStyle} onClick={handleSaveAs}>💾 Save As...</button>
            
            <div style={{height: 1, background: '#444', margin: '5px 0'}}></div>
            <button style={dropdownItemStyle} onClick={() => { setShowCompile(true); setActiveMenu(null); }}>
               🖨️ Compile Manuscript...
            </button>
            <button style={dropdownItemStyle} onClick={() => { setShowExportLore(true); setActiveMenu(null); }}>
               📚 Export Lore Cards...
            </button>
            
            <div style={{height: 1, background: '#444', margin: '5px 0'}}></div>
            <button 
              style={{...dropdownItemStyle, color: '#ff6b6b'}} 
              onClick={() => {
                setShowAutoSaveWarning(true);
                setActiveMenu(null);
              }}
            >
              ⚙️ Advanced: Auto-Save Settings
            </button>
          </Menu>

          <Menu label="View" name="view">
            <button style={dropdownItemStyle} onClick={() => { toggleTheme(); setActiveMenu(null); }}>
              🎨 Toggle Theme
            </button>
            <button style={dropdownItemStyle} onClick={toggleZenMode}>
              {isZenMode ? 'Show Sidebars' : 'Zen Mode (Hide Sidebars)'}
            </button>
          </Menu>

          <Menu label="Help" name="help">
            <button style={dropdownItemStyle} onClick={() => {
              setModal({
                isOpen: true,
                type: 'confirm',
                title: 'About Seymour',
                message: `Seymour v${packageJson.version}\n\nThe Ultimate World Building Tool.`,
                onConfirm: closeModal
              });
              setActiveMenu(null);
            }}>
               About Seymour
            </button>
          </Menu>

        </div>

        {/* RIGHT SIDE - SEARCH */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={onOpenSearch}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '4px 12px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--bg-hover)';
              e.target.style.borderColor = 'var(--accent)';
              e.target.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.borderColor = 'var(--border)';
              e.target.style.color = 'var(--text-muted)';
            }}
            title="Universal Search (Ctrl+K)"
          >
            <span>🔍</span>
            <span>Search</span>
            <kbd style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--border)',
              borderRadius: '3px',
              padding: '2px 5px',
              fontSize: '10px',
              fontFamily: 'monospace'
            }}>Ctrl+K</kbd>
          </button>
        </div>
      </div>

      {/* COMPILE & EXPORT MODALS */}
      {showCompile && <CompileModal isOpen={showCompile} onClose={() => setShowCompile(false)} />}
      {showExportLore && <ExportLoreModal isOpen={showExportLore} onClose={() => setShowExportLore(false)} />}
      
      {/* AUTO-SAVE WARNING MODAL */}
      {showAutoSaveWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '600px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: 'var(--text-main)', fontSize: '20px' }}>
              {autoSaveEnabled ? '⚠️ CRITICAL WARNING: Auto-Save Settings' : '✅ Re-enable Auto-Save'}
            </h2>
            
            {autoSaveEnabled ? (
              // Warning when auto-save is currently ON
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '16px', marginBottom: '15px' }}>
                  ⚠️ DANGER: Disabling Auto-Save Can Cause Data Loss!
                </p>
                <p style={{ color: 'var(--text-main)', marginBottom: '10px', lineHeight: '1.6' }}>
                  Auto-save is <strong>CURRENTLY ENABLED</strong> for your protection. Your work is automatically saved every 2 seconds.
                </p>
                <p style={{ color: 'var(--text-muted)', marginBottom: '15px', fontSize: '13px', lineHeight: '1.6' }}>
                  <strong>Disabling auto-save means:</strong>
                </p>
                <ul style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px' }}>
                  <li>You could lose hours of work if the app crashes</li>
                  <li>Browser refresh will lose unsaved changes</li>
                  <li>Switching chapters without saving loses your edits</li>
                  <li>You must manually save constantly</li>
                </ul>
                <p style={{ color: '#ff6b6b', marginTop: '15px', fontSize: '14px', fontWeight: 'bold' }}>
                  We STRONGLY recommend keeping auto-save enabled.
                </p>
              </div>
            ) : (
              // Message when auto-save is currently OFF
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '16px', marginBottom: '15px' }}>
                  ✅ Auto-Save is Currently DISABLED
                </p>
                <p style={{ color: 'var(--text-main)', marginBottom: '10px', lineHeight: '1.6' }}>
                  Your work is <strong>NOT being saved automatically</strong>. You're responsible for manually saving your changes.
                </p>
                <p style={{ color: 'var(--text-muted)', marginBottom: '15px', fontSize: '13px', lineHeight: '1.6' }}>
                  <strong>Re-enabling auto-save will:</strong>
                </p>
                <ul style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px' }}>
                  <li>Automatically save your work every 2 seconds</li>
                  <li>Protect you from losing progress if the app crashes</li>
                  <li>Eliminate the need to manually save constantly</li>
                  <li>Prevent data loss from accidental browser refresh</li>
                </ul>
                <p style={{ color: '#4ade80', marginTop: '15px', fontSize: '14px', fontWeight: 'bold' }}>
                  Recommended: Enable auto-save for maximum safety!
                </p>
              </div>
            )}
            
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {autoSaveEnabled ? (
              // Buttons when auto-save is ON
              <>
                <button
                  onClick={() => setShowAutoSaveWarning(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Keep Auto-Save ON (Recommended)
                </button>
                <button
                  onClick={async () => {
                    // Save current state before disabling
                    await dbSet('seymour_data', projectData);
                    localStorage.setItem('autoSaveEnabled', 'false');
                    setShowAutoSaveWarning(false);
                    window.location.reload();
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    color: '#ff6b6b',
                    border: '1px solid #ff6b6b',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  I Understand the Risks - Disable It
                </button>
              </>
            ) : (
              // Buttons when auto-save is OFF
              <>
                <button
                  onClick={() => setShowAutoSaveWarning(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    // Save current state before enabling auto-save
                    await dbSet('seymour_data', projectData);
                    localStorage.setItem('autoSaveEnabled', 'true');
                    setShowAutoSaveWarning(false);
                    window.location.reload();
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ✅ Enable Auto-Save (Recommended)
                </button>
              </>
            )}
          </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- STYLES ---
const barStyle = {
  height: '35px',
  background: '#1a1a1a', 
  borderBottom: '1px solid #333',
  display: 'flex',
  alignItems: 'center',
  padding: '0 15px',
  fontSize: '13px',
  color: '#ccc',
  userSelect: 'none',
  zIndex: 2000 
};

const menuItemStyle = {
  padding: '4px 10px',
  cursor: 'pointer',
  borderRadius: '4px',
  marginRight: '5px'
};

const dropdownStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  background: '#252525',
  border: '1px solid #444',
  borderRadius: '4px',
  padding: '5px 0',
  minWidth: '180px',
  boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
  zIndex: 2001
};

const dropdownItemStyle = {
  display: 'block',
  width: '100%',
  padding: '8px 15px',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  color: '#eee',
  cursor: 'pointer',
  fontSize: '12px',
  textDecoration: 'none'
};

const styleTag = document.createElement("style");
styleTag.innerHTML = `
  button:hover { background-color: rgba(255,255,255,0.1) !important; }
`;
document.head.appendChild(styleTag);

export default MenuBar;