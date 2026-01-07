import React, { useState, useEffect, useRef } from 'react';

const CustomModal = ({ isOpen, type = 'confirm', title, message, onConfirm, onCancel, defaultValue = '', projects = [] }) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [selectedProject, setSelectedProject] = useState(null);
  const inputRef = useRef(null);
  const hasInitialized = useRef(false);

  // Initialize input value only once when modal opens
  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      setInputValue(defaultValue);
      hasInitialized.current = true;
      if (type === 'projectList' && projects.length > 0) {
        setSelectedProject(projects[0].id);
      }
    }
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen, defaultValue, type, projects]);

  // Focus input automatically when modal opens
  useEffect(() => {
    if (isOpen && type === 'input' && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'input') {
      onConfirm(inputValue);
    } else if (type === 'projectList') {
      onConfirm(selectedProject);
    } else {
      onConfirm();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={type === 'projectList' ? { ...modalStyle, width: '500px' } : modalStyle} onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div style={headerStyle}>{title}</div>
        
        {/* BODY */}
        <div style={bodyStyle}>
          <p style={{ margin: '0 0 15px 0', lineHeight: '1.5' }}>{message}</p>
          
          {type === 'input' && (
            <input 
              ref={inputRef}
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              style={inputStyle}
            />
          )}
          
          {type === 'projectList' && (
            <div style={projectListStyle}>
              {projects.map(proj => (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProject(proj.id)}
                  style={{
                    ...projectItemStyle,
                    background: selectedProject === proj.id ? 'var(--accent)' : 'transparent',
                    color: selectedProject === proj.id ? '#fff' : 'var(--text-main)'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>📁 {proj.title}</div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                    Last modified: {new Date(proj.lastModified).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER BUTTONS */}
        <div style={footerStyle}>
          <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleConfirm} style={confirmBtnStyle}>
            {type === 'input' ? 'Create' : type === 'projectList' ? 'Open' : 'Confirm'}
          </button>
        </div>

      </div>
    </div>
  );
};

// --- STYLES ---
const overlayStyle = {
  position: 'fixed', 
  top: 0, 
  left: 0, 
  right: 0, 
  bottom: 0,
  background: 'rgba(0,0,0,0.7)', 
  zIndex: 99999,
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center',
  backdropFilter: 'blur(2px)',
  overflow: 'auto'
};

const modalStyle = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  width: '350px',
  maxWidth: '90vw',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  animation: 'fadeIn 0.2s ease-out',
  margin: 'auto'
};

const headerStyle = {
  padding: '15px',
  borderBottom: '1px solid var(--border)',
  fontWeight: 'bold',
  color: 'var(--text-main)',
  fontSize: '14px'
};

const bodyStyle = {
  padding: '20px',
  color: 'var(--text-muted)',
  fontSize: '13px'
};

const inputStyle = {
  width: '100%',
  padding: '8px',
  background: 'var(--bg-app)',
  border: '1px solid var(--border)',
  color: 'var(--text-main)',
  borderRadius: '4px',
  outline: 'none',
  fontSize: '14px',
  pointerEvents: 'auto',
  userSelect: 'text'
};

const footerStyle = {
  padding: '10px 15px',
  background: 'var(--bg-header)',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
  borderBottomLeftRadius: '8px',
  borderBottomRightRadius: '8px'
};

const btnBase = { padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', border: 'none' };
const cancelBtnStyle = { ...btnBase, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' };
const confirmBtnStyle = { ...btnBase, background: 'var(--accent)', color: 'white', fontWeight: 'bold' };

const projectListStyle = {
  maxHeight: '300px',
  overflowY: 'auto',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  background: 'var(--bg-app)'
};

const projectItemStyle = {
  padding: '12px',
  cursor: 'pointer',
  borderBottom: '1px solid var(--border)',
  transition: 'background 0.2s'
};

export default CustomModal;