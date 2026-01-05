import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Needed to reset view on New Project
import { useProject } from '../context/ProjectContext';
import CompileModal from './CompileModal';
import ExportLoreModal from './ExportLoreModal';
import CustomModal from './CustomModal'; // <--- We need the modal for New/Save As

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

const MenuBar = ({ toggleTheme, isZenMode, toggleZenMode }) => {
  const { projectData, setProjectData } = useProject();
  const navigate = useNavigate();
  
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

  // 2. SAVE (Quick)
  const handleSave = () => {
    downloadProject(projectData, projectData.title || 'project');
    setActiveMenu(null);
  };

  // 3. SAVE AS (Rename & Save)
  const handleSaveAs = () => {
    setActiveMenu(null);
    setModal({
      isOpen: true,
      type: 'input',
      title: 'Save Project As...',
      message: 'Enter a name for this version:',
      defaultValue: projectData.title || 'New Project',
      onConfirm: (newName) => {
        // Update title in state first
        const newData = { ...projectData, title: newName };
        setProjectData(newData);
        // Then download
        downloadProject(newData, newName);
        closeModal();
      }
    });
  };

  // Helper: Actual download logic
  const downloadProject = (data, filename) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${filename}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // 4. LOAD
  const handleLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        setProjectData(json);
        alert("Project Loaded Successfully!");
        navigate('/'); // Go home after load
      } catch (err) {
        alert("Failed to load project file. It might be corrupted.");
      }
    };
    reader.readAsText(file);
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
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
      />

      <div ref={menuRef} style={barStyle}>
        {/* APP TITLE / LOGO */}
        <div style={{ fontWeight: 'bold', marginRight: '20px', color: 'var(--accent)', letterSpacing: '1px' }}>
          SEYMOUR
          {/* Show current project title if available */}
          {projectData.title && <span style={{fontWeight: 'normal', color: '#666', fontSize: '12px', marginLeft: '10px'}}>— {projectData.title}</span>}
        </div>

        {/* MENUS */}
        <div style={{ display: 'flex' }}>
          
          <Menu label="File" name="file">
            <button style={dropdownItemStyle} onClick={handleNewProject}>📄 New Project</button>
            <div style={{height: 1, background: '#444', margin: '5px 0'}}></div>
            
            <label style={dropdownItemStyle}>
              📂 Load Project...
              <input type="file" accept=".json" onChange={handleLoad} style={{ display: 'none' }} />
            </label>
            
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
            <button style={dropdownItemStyle} onClick={toggleTheme}>
              🌗 Toggle Theme
            </button>
            <button style={dropdownItemStyle} onClick={toggleZenMode}>
              {isZenMode ? 'Show Sidebars' : 'Zen Mode (Hide Sidebars)'}
            </button>
          </Menu>

          <Menu label="Help" name="help">
            <button style={dropdownItemStyle} onClick={() => alert("Seymour v4.0\n\nThe Ultimate World Building Tool.")}>
               About Seymour
            </button>
          </Menu>

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
                  onClick={() => {
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
                  onClick={() => {
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