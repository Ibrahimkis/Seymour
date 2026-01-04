import React from 'react';
import { useProject } from '../../context/ProjectContext';

const GlobalScratchpad = () => {
  const { projectData, setProjectData } = useProject();

  const handleChange = (e) => {
    setProjectData({ ...projectData, globalNotes: e.target.value });
  };

  return (
    <div style={{ padding: '40px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      <h2 style={{ color: 'var(--text-main)', marginBottom: '20px' }}>📓 Global Scratchpad</h2>
      <textarea
        value={projectData.globalNotes || ""}
        onChange={handleChange}
        placeholder="Store your overarching plot points, series bibles, or random ideas here..."
        style={textAreaStyle}
      />
    </div>
  );
};

const textAreaStyle = {
  flex: 1,
  background: 'var(--bg-panel)',
  color: 'var(--text-main)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '20px',
  fontSize: '16px',
  lineHeight: '1.6',
  outline: 'none',
  resize: 'none',
  fontFamily: 'inherit'
};

export default GlobalScratchpad;