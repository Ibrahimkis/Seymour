import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import CustomModal from './CustomModal'; 

const LeftPanel = () => {
  const { projectData, setProjectData } = useProject();
  const navigate = useNavigate();
  const location = useLocation(); 

  // --- STATE ---
  const [modal, setModal] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} });
  const [deletedChapter, setDeletedChapter] = useState(null); 
  const [showToast, setShowToast] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  
  // NEW: Search State
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);

  const closeModal = () => setModal({ ...modal, isOpen: false });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+N - New Chapter
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        handleAddChapter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectData]);

  // Check for unsaved changes before navigation
  const checkUnsavedChanges = (path) => {
    const hasUnsavedChanges = sessionStorage.getItem('hasUnsavedChanges') === 'true';
    const autoSaveEnabled = localStorage.getItem('autoSaveEnabled');
    const isAutoSaveOn = autoSaveEnabled !== null ? JSON.parse(autoSaveEnabled) : true;
    
    // If we're on the editor with unsaved changes and auto-save is off, show warning
    if (location.pathname === '/editor' && hasUnsavedChanges && !isAutoSaveOn) {
      setPendingNavigation(path);
      setModal({
        isOpen: true,
        type: 'confirm',
        title: '⚠️ Unsaved Changes',
        message: 'You have unsaved changes. Do you want to navigate away without saving?',
        onConfirm: () => {
          sessionStorage.removeItem('hasUnsavedChanges');
          setPendingNavigation(null);
          navigate(path);
          closeModal();
        }
      });
      return false;
    }
    return true;
  };

  // --- ACTIONS ---
  const handleAddChapter = () => {
    const newId = Date.now();
    const newChapter = {
      id: newId,
      title: "New Chapter",
      content: "<p>Start writing here...</p>"
    };

    const newManuscript = { ...projectData.manuscript };
    if (!newManuscript.chapters) newManuscript.chapters = [];
    newManuscript.chapters.push(newChapter);

    setProjectData({ ...projectData, manuscript: newManuscript });
    // Clear search so the new chapter is visible immediately
    setSearchTerm('');
    navigate(`/editor?id=${newId}`);
  };

  const handleNav = (path) => {
    // Force save before navigation if on editor and autosave is enabled
    const autoSaveEnabled = localStorage.getItem('autoSaveEnabled');
    const isAutoSaveOn = autoSaveEnabled !== null ? JSON.parse(autoSaveEnabled) : true;
    
    if (location.pathname === '/editor' && isAutoSaveOn) {
      // Trigger a save event that the editor can pick up
      window.dispatchEvent(new CustomEvent('force-save-chapter'));
    }
    
    if (checkUnsavedChanges(path)) {
      navigate(path);
    }
  };

  const isActive = (id) => {
    return location.pathname === '/editor' && location.search === `?id=${id}`;
  };

  // --- DELETE LOGIC ---
  const requestDelete = (e, id) => {
    e.stopPropagation(); 
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Chapter?',
      message: 'This will remove the chapter from your manuscript.',
      onConfirm: () => executeDelete(id)
    });
  };

  const executeDelete = (id) => {
    const chapters = projectData.manuscript.chapters;
    const chapterToDelete = chapters.find(c => c.id === id);
    const index = chapters.indexOf(chapterToDelete);

    // 1. Save for Undo
    setDeletedChapter({ data: chapterToDelete, index });
    
    // 2. Remove from Data
    const newChapters = chapters.filter(c => c.id !== id);
    setProjectData({ 
      ...projectData, 
      manuscript: { ...projectData.manuscript, chapters: newChapters } 
    });

    // 3. UI Feedback
    closeModal();
    setShowToast(true);

    // 4. Redirect if we were looking at that chapter or if no chapters remain
    if (newChapters.length === 0) {
      navigate('/lore'); // World Database
    } else if (location.search.includes(id)) {
      navigate('/editor');
    }

    // 5. Timer to clear Undo
    setTimeout(() => {
      setShowToast(false);
    }, 15000);
    };

  // --- UNDO LOGIC ---
  const handleUndo = () => {
    if (!deletedChapter) return;

    const newChapters = [...projectData.manuscript.chapters];
    newChapters.splice(deletedChapter.index, 0, deletedChapter.data);

    setProjectData({ 
        ...projectData, 
        manuscript: { ...projectData.manuscript, chapters: newChapters } 
    });

    setShowToast(false);
    setDeletedChapter(null);
  };

  // --- FILTER LOGIC ---
  const chapters = projectData.manuscript.chapters || [];
  const filteredChapters = chapters.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside style={panelStyle}>
      
      <CustomModal 
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
      />

      {/* HEADER */}
      <div style={headerStyle}>BINDER</div>

      {/* TOOLS (Static Links) */}
      <nav style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px', flexShrink: 0 }}>
        <button onClick={() => handleNav('/lore')} style={location.pathname === '/lore' ? activeLinkStyle : linkStyle}>
          🗂️ World Database
        </button>
        <button onClick={() => handleNav('/map')} style={location.pathname === '/map' ? activeLinkStyle : linkStyle}>
          🗺️ World Map
        </button>
        <button onClick={() => handleNav('/scratchpad')} style={location.pathname === '/scratchpad' ? activeLinkStyle : linkStyle}>
          📓 Global Scratchpad
        </button>
        <button onClick={() => handleNav('/timeline')} style={location.pathname === '/timeline' ? activeLinkStyle : linkStyle}>
          ⏳ The Chronicle
        </button>
        <button onClick={() => handleNav('/web')} style={location.pathname === '/web' ? activeLinkStyle : linkStyle}>
          🕸️ The Web
        </button>
      </nav>
      
      <div style={headerStyle}>MANUSCRIPT</div>

      {/* SEARCH BAR */}
      <div style={{ padding: '0 10px 10px 10px', borderBottom: '1px solid var(--border)' }}>
        <input 
          ref={searchInputRef}
          type="text" 
          placeholder="🔍 Filter chapters..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
      </div>

      {/* DYNAMIC CHAPTER LIST */}
      <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {filteredChapters.map((chapter) => (
          <div 
            key={chapter.id}
            onClick={() => handleNav(`/editor?id=${chapter.id}`)}
            className="chapter-row" 
            style={isActive(chapter.id) ? activeLinkStyle : linkStyle}
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                📄 {chapter.title}
            </span>
            
            <button 
                onClick={(e) => requestDelete(e, chapter.id)}
                className="delete-chapter-btn"
                title="Delete Chapter"
            >×</button>
          </div>
        ))}
        {filteredChapters.length === 0 && searchTerm && (
            <div style={{ padding: '15px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                No chapters found.
            </div>
        )}
      </nav>

      {/* FOOTER ACTION */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)', flexShrink: 0, position: 'relative' }}>
        
        {/* UNDO TOAST */}
        {showToast && (
            <div style={toastStyle}>
                <span>Chapter deleted.</span>
                <button onClick={handleUndo} style={undoBtnStyle}>UNDO</button>
            </div>
        )}

        <button onClick={handleAddChapter} style={addBtnStyle} title="Add Chapter (Ctrl+Shift+N)">
          + Add Chapter
        </button>
      </div>

      {/* CSS FOR HOVER EFFECTS */}
      <style>{`
        .chapter-row { display: flex !important; align-items: center; justify-content: space-between; }
        .delete-chapter-btn { 
            background: none; border: none; color: #666; cursor: pointer; 
            font-size: 14px; padding: 0 5px; opacity: 0; transition: opacity 0.2s;
        }
        .chapter-row:hover .delete-chapter-btn { opacity: 1; }
        .delete-chapter-btn:hover { color: red; font-weight: bold; }
      `}</style>

    </aside>
  );
};

// --- STYLES ---
const panelStyle = { 
  width: '220px', 
  background: 'var(--bg-panel)', 
  borderRight: '1px solid var(--border)', 
  display: 'flex', 
  flexDirection: 'column', 
  height: '100%',
  overflow: 'hidden'
};

const headerStyle = { 
  padding: '15px 10px 5px 10px', 
  fontWeight: 'bold', 
  fontSize: '11px', 
  color: 'var(--text-muted)', 
  letterSpacing: '1px',
  flexShrink: 0 
};

const linkStyle = { 
  background: 'transparent', 
  borderTop: 'none',
  borderRight: 'none',
  borderBottom: 'none',
  borderLeft: 'none',
  color: 'var(--text-muted)', 
  textAlign: 'left', 
  padding: '6px 15px', 
  cursor: 'pointer', 
  fontSize: '13px', 
  whiteSpace: 'nowrap', 
  overflow: 'hidden', 
  textOverflow: 'ellipsis', 
  flexShrink: 0, 
  minHeight: '28px' 
};

const activeLinkStyle = { 
  ...linkStyle, 
  background: 'var(--bg-header)', 
  color: 'var(--text-main)', 
  borderLeft: '3px solid var(--accent)' 
};

const searchInputStyle = {
  width: '100%',
  background: 'var(--bg-app)',
  border: '1px solid var(--border)',
  color: 'var(--text-main)',
  padding: '6px',
  borderRadius: '4px',
  fontSize: '12px',
  outline: 'none',
  textAlign: 'center',
  boxSizing: 'border-box'
};

const addBtnStyle = { 
  width: '100%', 
  background: 'transparent', 
  border: '1px dashed var(--border)', 
  color: 'var(--text-muted)', 
  padding: '8px', 
  borderRadius: '4px', 
  cursor: 'pointer', 
  fontSize: '12px' 
};

const toastStyle = {
  position: 'absolute',
  top: '-40px', left: '10px', right: '10px',
  background: 'var(--text-main)',
  color: 'var(--bg-app)',
  padding: '8px 12px',
  borderRadius: '4px',
  fontSize: '12px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
  animation: 'fadeIn 0.2s ease-out',
  zIndex: 10
};

const undoBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--accent)',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '11px',
  textDecoration: 'underline'
};

export default LeftPanel;