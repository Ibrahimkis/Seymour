import { X } from 'lucide-react';

export default function SaveReminder({ onSave, onSaveAs, onDismiss }) {
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '24px' }}>💾</div>
          <h3 style={titleStyle}>Save Reminder</h3>
        </div>
        <button
          onClick={onDismiss}
          style={closeButtonStyle}
          title="Dismiss"
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <X size={18} />
        </button>
      </div>
      
      <p style={messageStyle}>
        You've been writing for a while. Consider saving your progress or creating a new version.
      </p>
      
      <div style={buttonContainerStyle}>
        <button
          onClick={onSave}
          style={primaryButtonStyle}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
        >
          Save (Ctrl+S)
        </button>
        <button
          onClick={onSaveAs}
          style={secondaryButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-panel)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          Save As New Version
        </button>
      </div>
      
      <button
        onClick={onDismiss}
        style={dismissButtonStyle}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        Remind me in 30 minutes
      </button>
    </div>
  );
}

const containerStyle = {
  position: 'fixed',
  bottom: '20px',
  left: '20px',
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  padding: '20px',
  zIndex: 50,
  maxWidth: '380px',
  animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  backdropFilter: 'blur(10px)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '12px',
};

const titleStyle = {
  margin: 0,
  fontSize: '16px',
  fontWeight: '600',
  color: 'var(--text-main)',
};

const closeButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  transition: 'all 0.2s',
};

const messageStyle = {
  fontSize: '13px',
  color: 'var(--text-muted)',
  lineHeight: '1.5',
  marginBottom: '16px',
  margin: '0 0 16px 0',
};

const buttonContainerStyle = {
  display: 'flex',
  gap: '10px',
  marginBottom: '10px',
};

const primaryButtonStyle = {
  flex: 1,
  padding: '10px 16px',
  background: 'var(--accent)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const secondaryButtonStyle = {
  flex: 1,
  padding: '10px 16px',
  background: 'var(--bg-panel)',
  color: 'var(--text-main)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const dismissButtonStyle = {
  width: '100%',
  padding: '8px',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  borderRadius: '4px',
};
