// SceneModal removed
import React, { useState } from 'react';

const SceneModal = ({ selectedText, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [pov, setPov] = useState('');
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('Please enter a scene title');
      return;
    }
    onSave({ title, pov, location, time, purpose, notes });
  };

  const inputStyle = {
    width: '100%',
    background: 'var(--bg-header)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '8px',
    color: 'var(--text-main)',
    fontSize: '14px',
    marginBottom: '12px',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '25px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '85vh',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-main)' }}>🎬 Create New Scene</h3>
        
        <div style={{
          padding: '12px',
          background: 'var(--bg-app)',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '13px',
          color: 'var(--text-muted)',
          maxHeight: '100px',
          overflow: 'auto'
        }}>
          "{selectedText.substring(0, 200)}{selectedText.length > 200 ? '...' : ''}"
        </div>

        <label style={labelStyle}>Scene Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., The Confrontation"
          style={inputStyle}
          autoFocus
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>POV Character</label>
            <input
              type="text"
              value={pov}
              onChange={(e) => setPov(e.target.value)}
              placeholder="e.g., Leon"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Aker's Palace"
              style={inputStyle}
            />
          </div>
        </div>

        <label style={labelStyle}>Time</label>
        <input
          type="text"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="e.g., Dawn, Day 3"
          style={inputStyle}
        />

        <label style={labelStyle}>Purpose/Goal</label>
        <input
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="e.g., Reveal betrayal"
          style={inputStyle}
        />

        <label style={labelStyle}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes about this scene..."
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
        />

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'var(--bg-header)',
              border: '1px solid var(--border)',
              padding: '10px',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'var(--text-main)',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              background: 'var(--accent)',
              border: 'none',
              padding: '10px',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            Create Scene
          </button>
        </div>
      </div>
    </div>
  );
};

export default SceneModal;
