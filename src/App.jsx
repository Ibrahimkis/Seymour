import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { useProject } from './context/ProjectContext';

// Import Features
import LoreCard from './features/lore/LoreCard';
import EditorLayout from './features/editor/EditorLayout';
import WorldMapPage from './features/map/WorldMapPage';
import GlobalScratchpad from './features/editor/GlobalScratchpad';
import ChronicleLayout from './features/chronicle/ChronicleLayout';
import RelationshipWeb from './features/relationships/RelationshipWeb';

import './App.css';

function App() {
  const [theme, setTheme] = useState('dark');
  const { saveToDisk, loadFromDisk, projectData, setProjectData } = useProject();

  // Default project structure (should match ProjectContext)
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
        saveToDisk();
      });

      window.electronAPI.onMenuSaveProjectAs(() => {
        // For now, same as save
        saveToDisk();
      });

      window.electronAPI.onMenuGetProjectData(() => {
        // Send current project data to main process for native save dialog
        window.electronAPI.sendProjectData(projectData);
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
  }, [saveToDisk, setProjectData]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ErrorBoundary>
      <Router>
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
      </Router>
    </ErrorBoundary>
  );
}

export default App;