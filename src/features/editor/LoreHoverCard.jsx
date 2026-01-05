import React from 'react';
import { useNavigate } from 'react-router-dom';

const LoreHoverCard = ({ character, position }) => {
  const navigate = useNavigate();
  
  if (!character) return null;

  const aliasString = character.aliases && character.aliases.length > 0 
    ? character.aliases.join(', ') 
    : null;

  const handleClick = () => {
    const hasUnsavedChanges = sessionStorage.getItem('hasUnsavedChanges') === 'true';
    const autoSaveEnabled = localStorage.getItem('autoSaveEnabled');
    const isAutoSaveOn = autoSaveEnabled !== null ? JSON.parse(autoSaveEnabled) : true;
    
    // If auto-save is off and there are unsaved changes, trigger warning
    if (!isAutoSaveOn && hasUnsavedChanges) {
      window.pendingLoreNavigation = character.id;
      // Trigger the warning modal by dispatching a custom event
      window.dispatchEvent(new CustomEvent('showUnsavedWarning'));
      return;
    }
    
    navigate(`/lore?id=${character.id}`);
  };

  return (
    <div 
      onClick={handleClick}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y + 24,
        zIndex: 2000,
        background: 'var(--bg-panel)',
        border: '1px solid var(--accent)',
        borderRadius: '8px',
        padding: '12px',
        width: '280px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        display: 'flex',
        gap: '12px',
        cursor: 'pointer',
        animation: 'fadeIn 0.2s ease-out',
        transition: 'transform 0.1s ease'
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{
        width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden',
        border: '2px solid var(--border)', flexShrink: 0, background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {character.imageSrc ? (
           <div style={{ width: '100%', height: '100%', ...character.imageStyles, backgroundImage: `url(${character.imageSrc})`, backgroundRepeat: 'no-repeat', backgroundSize: 'cover' }} />
        ) : (
          <span style={{ fontSize: '24px' }}>👤</span>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-main)', fontSize: '14px', lineHeight: '1.2' }}>{character.name}</h4>
        {aliasString && (
          <div style={{ fontSize: '10px', color: 'var(--accent)', marginBottom: '6px', fontStyle: 'italic' }}>aka {aliasString}</div>
        )}
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {getSummary(character)}
        </p>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

// Updated to prioritize the new dedicated 'biography' field
const getSummary = (char) => {
  // 1. DEDICATED BIO FIELD
  if (char.biography && char.biography.trim().length > 0) return char.biography;

  // 2. Fallback to old sections
  if (!char.sections) return "No details available.";
  for (let s of char.sections) {
    for (let b of s.blocks) {
      if (['role', 'title', 'class', 'description', 'summary', 'biography'].includes(b.label.toLowerCase()) && b.content) {
        return b.content;
      }
    }
  }
  if (char.sections[0] && char.sections[0].blocks[0]) return char.sections[0].blocks[0].content;
  return "No details available.";
};

export default LoreHoverCard;