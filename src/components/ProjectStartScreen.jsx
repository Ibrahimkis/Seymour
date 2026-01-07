import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import CustomModal from './CustomModal';
import packageJson from '../../package.json';

const EMPTY_PROJECT = {
  title: "Untitled Project",
  globalNotes: "",
  settings: { fontSize: 18, zoom: 100, fontFamily: "serif", customFonts: [] },
  manuscript: {
    chapters: [{ id: 1, title: "Chapter 1", content: "<p>Once upon a time...</p>", synopsis: "", notes: "" }]
  },
  lore: {
    characters: [],
    folders: [
      { id: 'root_char', name: 'Characters', parentId: null, isOpen: true },
      { id: 'root_loc', name: 'Locations', parentId: null, isOpen: true },
      { id: 'root_misc', name: 'Unsorted', parentId: null, isOpen: true },
    ]
  },
  worldMap: { imageSrc: null, pins: [] },
  timeline: [],
  relationships: [],
};

const ProjectStartScreen = ({ theme, onThemeChange, onProjectSelected }) => {
  const navigate = useNavigate();
  const { setProjectData, setProjectId, setProjectFilePath } = useProject();
  const [recentProjects, setRecentProjects] = useState([]);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  useEffect(() => {
    // Load recent projects from localStorage
    const saved = localStorage.getItem('recentProjects');
    if (saved) {
      try {
        setRecentProjects(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to load recent projects:', err);
      }
    }

    // Check if this is first launch (no theme preference)
    const hasThemePreference = localStorage.getItem('themePreference');
    if (!hasThemePreference) {
      setShowThemeSelector(true);
    }
  }, []);

  const handleCreateNew = async () => {
    // If running in Electron, ask for directory first
    if (window.electronAPI) {
      const result = await window.electronAPI.selectDirectory();
      if (result.canceled || !result.success) {
        return; // User canceled directory selection
      }
      // Store the selected directory path temporarily
      window.selectedProjectDirectory = result.directoryPath;
    }
    
    // Then show the name input modal
    setShowNameInput(true);
  };

  const confirmCreateProject = async (name) => {
    if (!name || !name.trim()) return;

    // If running in Electron, use the previously selected directory
    if (window.electronAPI && window.selectedProjectDirectory) {
      const newProject = { 
        ...EMPTY_PROJECT, 
        title: name,
        projectPath: window.selectedProjectDirectory // Store the selected directory
      };
      
      // Save immediately to the selected directory
      const filePath = `${window.selectedProjectDirectory}/${name}.seymour`;
      await window.electronAPI.saveProjectToPath(filePath, newProject);
      
      // Set project data AND file path for autosave
      const newProjectId = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      setProjectData(newProject);
      setProjectId(newProjectId);
      setProjectFilePath(filePath);
      
      console.log(`✅ Created new project at: ${filePath}`);
      
      // Clear the temporary directory path
      delete window.selectedProjectDirectory;
    } else {
      // Web version - no directory selection
      const newProject = { ...EMPTY_PROJECT, title: name };
      setProjectData(newProject);
      
      // Add to recent projects
      const updated = [
        { name: name, lastOpened: Date.now(), data: newProject },
        ...recentProjects.slice(0, 9) // Keep only 10 most recent
      ];
      localStorage.setItem('recentProjects', JSON.stringify(updated));
    }
    
    setShowNameInput(false);
    onProjectSelected();
    navigate('/lore');
  };

  const handleLoadProject = async (e) => {
    // If Electron API is available, use native dialog for proper path tracking
    if (window.electronAPI?.openProjectDialog) {
      const result = await window.electronAPI.openProjectDialog();
      if (result.success && result.data) {
        try {
          const project = JSON.parse(result.data);
          if (!project.title) {
            const fileName = result.filePath.split(/[\\/]/).pop();
            project.title = fileName.replace(/\.(json|seymour)$/i, '');
          }
          
          // Extract filename and projectId
          const fileName = result.filePath.split(/[\\/]/).pop();
          const newProjectId = fileName.replace(/\.(json|seymour)$/i, '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
          
          setProjectData(project);
          setProjectId(newProjectId);
          setProjectFilePath(result.filePath);
          
          // Add to recent projects
          const updated = [
            { name: project.title || 'Untitled', lastOpened: Date.now(), data: project },
            ...recentProjects.filter(p => p.name !== project.title).slice(0, 9)
          ];
          localStorage.setItem('recentProjects', JSON.stringify(updated));
          
          console.log(`✅ Loaded project from: ${result.filePath}`);
          onProjectSelected();
          navigate('/lore');
        } catch (err) {
          console.error('Failed to load project:', err);
          alert('Failed to load project. Please make sure the file is a valid Seymour project.');
        }
      }
      // Reset the file input
      e.target.value = '';
      return;
    }
    
    // Fallback to file input for web
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target.result);
        // Ensure title exists, use filename without extension as fallback
        if (!project.title) {
          project.title = file.name.replace(/\.(json|seymour)$/i, '');
        }
        setProjectData(project);
        
        // Add to recent projects
        const updated = [
          { name: project.title || 'Untitled', lastOpened: Date.now(), data: project },
          ...recentProjects.filter(p => p.name !== project.title).slice(0, 9)
        ];
        localStorage.setItem('recentProjects', JSON.stringify(updated));
        
        onProjectSelected();
        navigate('/lore');
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
  };

  const handleOpenRecent = (project) => {
    setProjectData(project.data);
    
    // Update last opened time
    const updated = [
      { ...project, lastOpened: Date.now() },
      ...recentProjects.filter(p => p.name !== project.name)
    ];
    localStorage.setItem('recentProjects', JSON.stringify(updated));
    
    onProjectSelected();
    navigate('/lore');
  };

  const handleThemeSelect = (selectedTheme) => {
    onThemeChange(selectedTheme);
    localStorage.setItem('themePreference', selectedTheme);
    setShowThemeSelector(false);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    return date.toLocaleDateString();
  };

  if (showThemeSelector) {
    return (
      <div style={overlayStyle}>
        <div style={themeModalStyle}>
          <h2 style={{ margin: '0 0 15px 0', color: '#e0e0e0', textAlign: 'center' }}>
            Welcome to Seymour
          </h2>
          <p style={{ color: '#a0a0a0', marginBottom: '30px', textAlign: 'center', fontSize: '14px' }}>
            Choose your preferred theme
          </p>
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button 
              onClick={() => handleThemeSelect('dark')}
              style={{...themeButtonStyle, background: 'linear-gradient(135deg, #2d2d2d, #404040)'}}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08) translateY(-5px)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌙</div>
              <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '16px' }}>Dark</div>
              <div style={{ fontSize: '12px', color: '#888' }}>Classic dark mode</div>
            </button>

            <button 
              onClick={() => handleThemeSelect('light')}
              style={{...themeButtonStyle, background: 'linear-gradient(135deg, #f0f0f0, #dcdcdc)', color: '#333'}}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08) translateY(-5px)';
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>☀️</div>
              <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '16px' }}>Light</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Bright & clean</div>
            </button>

            <button 
              onClick={() => handleThemeSelect('lore')}
              style={{...themeButtonStyle, background: 'linear-gradient(135deg, #1a2520, #2d3e36)'}}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08) translateY(-5px)';
                e.currentTarget.style.borderColor = 'rgba(111, 194, 118, 0.4)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(111, 194, 118, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌿</div>
              <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '16px' }}>Lore</div>
              <div style={{ fontSize: '12px', color: '#8fa88f' }}>Mystic green</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* CustomModal for project name input - rendered outside to avoid z-index issues */}
      <CustomModal
        isOpen={showNameInput}
        type="input"
        title="Create New Project"
        message="Enter a name for your new project:"
        defaultValue="My Novel"
        onConfirm={confirmCreateProject}
        onCancel={() => setShowNameInput(false)}
      />
      
      {/* CustomModal for error messages */}
      <CustomModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
      />
      
      <div style={{...overlayBackdropStyle, pointerEvents: showNameInput ? 'none' : 'auto'}}>
        <div style={windowContainerStyle}>

        {/* Window Header */}
        <div style={windowHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '24px' }}>📚</div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--text-main)' }}>
              SEYMOUR PROJECT HUB
            </h1>
          </div>
          <button 
            onClick={onProjectSelected}
            style={closeButtonStyle}
            onMouseEnter={(e) => e.currentTarget.style.background = '#ff4444'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* Window Content */}
        <div style={windowContentStyle}>
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={handleCreateNew} style={compactActionButtonStyle}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>New Project</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                Start fresh
              </div>
            </button>

            <label style={compactActionButtonStyle}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📂</div>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>Open Project</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                Load existing
              </div>
              <input type="file" accept=".seymour,.json" onChange={handleLoadProject} style={{ display: 'none' }} />
            </label>

            <button onClick={onProjectSelected} style={compactActionButtonStyle}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚡</div>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>Start Empty</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                No project
              </div>
            </button>
          </div>

          {/* Recent Projects */}
          {recentProjects.length > 0 && (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '600' }}>
                  Recent Projects
                </h3>
                <div style={{ height: '1px', flex: 1, background: 'var(--border)', marginLeft: '15px' }}></div>
              </div>
              <div style={compactProjectGridStyle}>
                {recentProjects.slice(0, 6).map((project, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOpenRecent(project)}
                    style={compactProjectCardStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    }}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.9 }}>📖</div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                      {project.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
                      {formatDate(project.lastOpened)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Window Footer */}
        <div style={windowFooterStyle}>
          <button 
            onClick={() => setShowThemeSelector(true)}
            style={{ 
              background: 'var(--bg-panel)', 
              border: '1px solid var(--border)', 
              color: 'var(--text-muted)', 
              fontSize: '11px', 
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-header)';
              e.currentTarget.style.color = 'var(--text-main)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-panel)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            🎨 <span>Theme</span>
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '500' }}>
            v{packageJson.version}
          </span>
        </div>
      </div>
    </div>
    </>
  );
};

const overlayBackdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  backdropFilter: 'blur(12px)',
  animation: 'fadeIn 0.3s ease-out'
};

const windowContainerStyle = {
  background: 'var(--bg-app)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  width: '90%',
  maxWidth: '1100px',
  maxHeight: '85vh',
  boxShadow: '0 30px 90px rgba(0,0,0,0.7)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
};

const windowHeaderStyle = {
  background: 'var(--bg-header)',
  borderBottom: '1px solid var(--border)',
  padding: '15px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0
};

const closeButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '20px',
  cursor: 'pointer',
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s'
};

const windowContentStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '30px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
};

const windowFooterStyle = {
  background: 'var(--bg-header)',
  borderTop: '1px solid var(--border)',
  padding: '12px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0
};

const compactActionButtonStyle = {
  background: 'var(--bg-panel)',
  border: '2px solid var(--border)',
  borderRadius: '12px',
  padding: '35px 25px',
  cursor: 'pointer',
  textAlign: 'center',
  color: 'var(--text-main)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  width: '180px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
};

const compactProjectGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: '15px',
  width: '100%'
};

const compactProjectCardStyle = {
  background: 'var(--bg-panel)',
  border: '2px solid var(--border)',
  borderRadius: '10px',
  padding: '20px 18px',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.95)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10001,
  backdropFilter: 'blur(8px)'
};

const themeModalStyle = {
  background: 'linear-gradient(135deg, #2d2d2d 0%, #252525 100%)',
  border: '2px solid #404040',
  borderRadius: '16px',
  padding: '50px',
  maxWidth: '800px',
  boxShadow: '0 25px 70px rgba(0,0,0,0.6)'
};

const themeButtonStyle = {
  padding: '35px 30px',
  border: '2px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  cursor: 'pointer',
  textAlign: 'center',
  color: '#e0e0e0',
  minWidth: '180px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
};

export default ProjectStartScreen;
