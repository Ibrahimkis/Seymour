import React from 'react';
import packageJson from '../../package.json';

const SplashScreen = () => {
  return (
    <div style={overlayStyle}>
      <div style={splashBoxStyle}>
        <div style={logoStyle}>📚</div>
        <h1 style={titleStyle}>Seymour</h1>
        <p style={taglineStyle}>The distraction-free environment for world builders</p>
        
        <div style={loaderContainerStyle}>
          <div style={loaderBarStyle}>
            <div style={loaderFillStyle}></div>
          </div>
          <p style={loadingTextStyle}>Loading your project...</p>
        </div>
        
        <p style={versionStyle}>v{packageJson.version}</p>
      </div>
      
      <style>{`
        @keyframes fillLoader {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  animation: 'fadeIn 0.3s ease-out'
};

const splashBoxStyle = {
  background: 'rgba(40, 40, 40, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '40px 60px',
  textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(10px)',
  minWidth: '400px'
};

const logoStyle = {
  fontSize: '64px',
  marginBottom: '20px',
  animation: 'pulse 2s ease-in-out infinite'
};

const titleStyle = {
  margin: '0 0 10px 0',
  fontSize: '42px',
  fontWeight: 'bold',
  color: '#ffffff',
  letterSpacing: '2px',
  fontFamily: 'serif'
};

const taglineStyle = {
  margin: '0 0 40px 0',
  fontSize: '14px',
  color: '#999',
  fontStyle: 'italic'
};

const loaderContainerStyle = {
  marginBottom: '30px'
};

const loaderBarStyle = {
  width: '100%',
  height: '4px',
  background: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '2px',
  overflow: 'hidden',
  marginBottom: '10px'
};

const loaderFillStyle = {
  height: '100%',
  background: 'linear-gradient(90deg, #4a9eff, #7b68ee)',
  borderRadius: '2px',
  animation: 'fillLoader 2s ease-in-out infinite'
};

const loadingTextStyle = {
  margin: 0,
  fontSize: '13px',
  color: '#666',
  fontWeight: '500'
};

const versionStyle = {
  margin: 0,
  fontSize: '11px',
  color: '#444',
  fontFamily: 'monospace'
};

export default SplashScreen;
