import React, { useState } from 'react';

const EditorFooter = ({ editor }) => {
  if (!editor) return null;

  const [goal, setGoal] = useState(500); // Default word goal
  const wordCount = editor.storage.characterCount.words();
  const charCount = editor.storage.characterCount.characters();
  
  // Calculate progress percentage
  const progress = Math.min((wordCount / goal) * 100, 100);
  const readTime = Math.ceil(wordCount / 200);

  return (
    <div style={footerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📝 {wordCount} Words</span>
          <div style={progressBg}>
            <div style={{ ...progressFill, width: `${progress}%` }}></div>
          </div>
          <span style={{ fontSize: '10px', color: '#666' }}>
            Goal: 
            <input 
              type="number" 
              value={goal} 
              onChange={(e) => setGoal(parseInt(e.target.value) || 0)} 
              style={goalInput}
            />
          </span>
        </div>
        
        <span>🔤 {charCount} Chars</span>
        <span>⏱️ ~{readTime} min read</span>
      </div>
      
      <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>
        {progress === 100 ? "🎉 Goal Reached!" : `${goal - wordCount} words to go`}
      </div>
    </div>
  );
};

// --- STYLES ---
const footerStyle = {
  height: '35px',
  background: 'var(--bg-header)',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  fontSize: '12px',
  color: 'var(--text-muted)',
  flexShrink: 0,
  zIndex: 10
};

const progressBg = {
  width: '100px',
  height: '6px',
  background: '#333',
  borderRadius: '3px',
  overflow: 'hidden'
};

const progressFill = {
  height: '100%',
  background: 'var(--accent)',
  transition: 'width 0.3s ease'
};

const goalInput = {
  background: 'transparent',
  border: 'none',
  color: 'var(--accent)',
  width: '40px',
  fontSize: '10px',
  marginLeft: '4px',
  outline: 'none'
};

export default EditorFooter;