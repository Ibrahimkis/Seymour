import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import { useProject } from './context/ProjectContext';

// Import all your features...
import LoreCard from './features/lore/LoreCard';
import EditorLayout from './features/editor/EditorLayout';
import WorldMapPage from './features/map/WorldMapPage';
import GlobalScratchpad from './features/editor/GlobalScratchpad';
import ChronicleLayout from './features/chronicle/ChronicleLayout';
import RelationshipWeb from './features/relationships/RelationshipWeb';

import './App.css';

// --- PROTECTED ROUTE WRAPPER ---
const ProtectedRoute = ({ children }) => {
  const { user } = useProject();
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTE */}
        <Route path="/login" element={<LoginPage />} />

        {/* PROTECTED APP ROUTES */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout theme={theme} toggleTheme={toggleTheme} />
          </ProtectedRoute>
        }>
          <Route index element={<LoreCard />} /> {/* Default to Lore or Editor */}
          <Route path="lore" element={<LoreCard />} />
          <Route path="map" element={<WorldMapPage />} />
          <Route path="scratchpad" element={<GlobalScratchpad />} />
          <Route path="editor" element={<EditorLayout />} />
          <Route path="timeline" element={<ChronicleLayout />} />
          <Route path="web" element={<RelationshipWeb />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;