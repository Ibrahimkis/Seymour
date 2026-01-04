import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Navigate } from 'react-router-dom';

const LoginPage = () => {
  const { user, login } = useProject();

  // If already logged in, go to main app
  if (user) return <Navigate to="/" />;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#fff' }}>Seymour</h1>
        <p style={{ margin: '0 0 30px 0', color: '#888' }}>The distraction-free environment for world builders.</p>
        
        <button onClick={login} style={googleBtnStyle}>
          <span style={{ marginRight: '10px' }}>G</span> Sign in with Google
        </button>
        
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#555' }}>
          Your data is securely synced to the cloud.
        </div>
      </div>
    </div>
  );
};

const containerStyle = {
  height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#0a0a0a', fontFamily: 'sans-serif'
};

const cardStyle = {
  textAlign: 'center', padding: '40px', background: '#111', 
  border: '1px solid #333', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
};

const googleBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', padding: '12px', background: '#fff', color: '#000',
  border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer',
  fontSize: '14px', transition: 'background 0.2s'
};

export default LoginPage;