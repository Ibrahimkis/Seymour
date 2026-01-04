import React, { useState, useEffect, useRef } from 'react';

const CustomModal = ({ isOpen, type = 'confirm', title, message, onConfirm, onCancel, defaultValue = '' }) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const inputRef = useRef(null);

  // Focus input automatically when modal opens
  useEffect(() => {
    if (isOpen && type === 'input' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (isOpen) setInputValue(defaultValue); // Reset value on open
  }, [isOpen, type, defaultValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'input') {
      onConfirm(inputValue);
    } else {
      onConfirm();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        
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
        </div>

        {/* FOOTER BUTTONS */}
        <div style={footerStyle}>
          <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleConfirm} style={confirmBtnStyle}>
            {type === 'input' ? 'Create' : 'Confirm'}
          </button>
        </div>

      </div>
    </div>
  );
};

// --- STYLES ---
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.7)', zIndex: 9999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(2px)' // Nice blur effect
};

const modalStyle = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  width: '350px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  animation: 'fadeIn 0.2s ease-out'
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
  fontSize: '14px'
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

export default CustomModal;