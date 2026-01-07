import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import ProjectStartScreen from './components/ProjectStartScreen';
import { useProject } from './context/ProjectContext';

// Import Features
import LoreCard from './features/lore/LoreCard';
import EditorLayout from './features/editor/EditorLayout';
import WorldMapPage from './features/map/WorldMapPage';
import GlobalScratchpad from './features/editor/GlobalScratchpad';
import ChronicleLayout from './features/chronicle/ChronicleLayout';
import RelationshipWeb from './features/relationships/RelationshipWeb';

import './App.css';

// Component to force initial navigation to /lore
const InitialNavigator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Only navigate on first load (when at root)
    if (location.pathname === '/') {
      navigate('/lore', { replace: true });
    }
  }, []);
  
  return null;
};

// Default project structure (moved outside component to prevent recreation)
const defaultProject = {
  title: "Untitled Project",
  globalNotes: "",
  settings: {
    fontSize: 18,
    zoom: 100,
    fontFamily: "serif",
    customFonts: [],
  },
  manuscript: {
    chapters: [
      {
        id: 1,
        title: "Chapter 1",
        content: "<p>Once upon a time...</p>",
        synopsis: "",
        notes: "",
      },
    ],
  },
  lore: {
    characters: [],
    folders: [
      { id: "root_char", name: "Characters", parentId: null, isOpen: true },
      { id: "root_loc", name: "Locations", parentId: null, isOpen: true },
      { id: "root_misc", name: "Unsorted", parentId: null, isOpen: true },
    ],
  },
  worldMap: { imageSrc: null, pins: [] },
  timeline: [],
  relationships: [],
};

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('themePreference') || 'dark';
  });
  const [showSplash, setShowSplash] = useState(true);
  const [showStartScreen, setShowStartScreen] = useState(false);
  const { saveToDisk, saveToCurrentPath, loadFromDisk, projectData, setProjectData } = useProject();
  
  // Use ref to always access current projectData without re-rendering
  const projectDataRef = useRef(projectData);
  
  // Keep ref in sync with projectData
  useEffect(() => {
    projectDataRef.current = projectData;
  }, [projectData]);

  // Show splash screen for 3-5 seconds for premium feel
  useEffect(() => {
    // Remove the static HTML splash screen
    const staticSplash = document.getElementById('splash-screen');
    if (staticSplash) {
      staticSplash.style.display = 'none';
    }
    
    const splashDuration = 3000 + Math.random() * 2000; // Random between 3-5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
      setShowStartScreen(true); // Show start screen after splash
    }, splashDuration);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Keep OS/Electron window title in sync with the current project
  useEffect(() => {
    const rawTitle = projectData?.title;
    const cleanedTitle = typeof rawTitle === 'string' ? rawTitle.trim() : '';
    document.title = cleanedTitle ? `Seymour - ${cleanedTitle}` : 'Seymour';
  }, [projectData?.title]);

  useEffect(() => {
    // Set up Electron menu IPC listeners
    if (window.electronAPI) {
      window.electronAPI.onMenuNewProject(() => {
        setProjectData(defaultProject);
      });

      window.electronAPI.onMenuLoadProject((event, data) => {
        try {
          const project = JSON.parse(data);
          setProjectData(project);
        } catch (err) {
          console.error('Failed to load project:', err);
        }
      });

      window.electronAPI.onMenuSaveProject(() => {
        saveToCurrentPath();
      });

      window.electronAPI.onMenuSaveProjectAs(() => {
        saveToDisk();
      });

      window.electronAPI.onMenuGetProjectData(() => {
        // Send current project data to main process for native save dialog
        // Use ref to access latest projectData without dependency issues
        window.electronAPI.sendProjectData(projectDataRef.current);
      });

      // Removed: menu-export, menu-find, menu-toggle-theme, menu-zen-mode
      // These are now handled in Layout.jsx
    }

    // Cleanup listeners on unmount
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-new-project');
        window.electronAPI.removeAllListeners('menu-load-project');
        window.electronAPI.removeAllListeners('menu-save-project');
        window.electronAPI.removeAllListeners('menu-save-project-as');
        window.electronAPI.removeAllListeners('menu-get-project-data');
        // Removed cleanup for moved listeners
      }
    };
  }, [saveToDisk, saveToCurrentPath, setProjectData]);
  
  // Separate effect for app closing to avoid dependency issues
  useEffect(() => {
    if (!window.electronAPI) return;
    
    const handleAppClosing = async () => {
      console.log('💾 App closing - saving project...');
      try {
        // Force save before closing
        await saveToCurrentPath();
        console.log('✅ Project saved successfully before closing');
      } catch (err) {
        console.error('❌ Failed to save before closing:', err);
      } finally {
        // Close the window after save attempt
        window.electronAPI.close();
      }
    };
    
    window.electronAPI.onAppClosing(handleAppClosing);
    
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('app-closing');
      }
    };
  }, [saveToCurrentPath]);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : prev === 'light' ? 'lore' : 'dark';
      localStorage.setItem('themePreference', newTheme);
      return newTheme;
    });
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('themePreference', newTheme);
  };

  // Show splash screen while loading
  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <InitialNavigator />
        <Routes>
          {/* DIRECT ACCESS TO LAYOUT (No Login Required) */}
          <Route path="/" element={<Layout theme={theme} toggleTheme={toggleTheme} />}>
            <Route index element={<LoreCard />} />
            <Route path="lore" element={<LoreCard />} />
            <Route path="map" element={<WorldMapPage />} />
            <Route path="scratchpad" element={<GlobalScratchpad />} />
            <Route path="editor" element={<EditorLayout />} />
            <Route path="timeline" element={<ChronicleLayout />} />
            <Route path="web" element={<RelationshipWeb />} />
          </Route>
        </Routes>
        
        {/* Project Start Screen as Overlay Window */}
        {showStartScreen && (
          <ProjectStartScreen 
            theme={theme}
            onThemeChange={handleThemeChange}
            onProjectSelected={() => setShowStartScreen(false)}
          />
        )}
      </Router>
    </ErrorBoundary>
  );
}

export default App;