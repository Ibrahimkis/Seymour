import React from 'react';
import CustomModal from './CustomModal';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showAlertModal: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App crashed:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    // Option 1: Just reload
    window.location.reload();
    
    // Option 2: Clear corrupt data (dangerous!)
    // localStorage.removeItem('seymour_data');
    // window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={errorScreenStyle}>
          <div style={errorBoxStyle}>
            <h1 style={{ margin: '0 0 10px 0', color: '#e74c3c' }}>😞 Something Went Wrong</h1>
            <p style={{ color: '#ccc', marginBottom: '20px' }}>
              Seymour encountered an error and couldn't recover.
            </p>
            
            <details style={{ marginBottom: '20px', background: '#222', padding: '10px', borderRadius: '4px' }}>
              <summary style={{ cursor: 'pointer', color: '#888', fontSize: '12px' }}>
                Technical Details (for debugging)
              </summary>
              <pre style={{ fontSize: '11px', color: '#666', overflow: 'auto', marginTop: '10px' }}>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={this.handleReset} style={buttonStyle}>
                🔄 Reload App
              </button>
              <button 
                onClick={() => {
                  // Copy error to clipboard for bug reports
                  const errorText = `${this.state.error}\n${this.state.errorInfo?.componentStack}`;
                  navigator.clipboard.writeText(errorText);
                  this.setState({ showAlertModal: true });
                }}
                style={{...buttonStyle, background: '#333'}}
              >
                📋 Copy Error
              </button>
            </div>

            <p style={{ fontSize: '11px', color: '#666', marginTop: '20px' }}>
              💡 Tip: Try exporting your project (File → Save) before reloading to prevent data loss.
            </p>
          </div>
          <CustomModal
            isOpen={this.state.showAlertModal}
            onClose={() => this.setState({ showAlertModal: false })}
            title="Error Copied"
            message="Error details copied! Please report this bug."
            type="alert"
          />
        </div>
      );
    }

    return this.props.children;
  }
}

const errorScreenStyle = {
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0a0a0a',
  color: 'white',
  fontFamily: 'sans-serif'
};

const errorBoxStyle = {
  maxWidth: '500px',
  padding: '40px',
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '8px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
};

const buttonStyle = {
  padding: '10px 20px',
  background: '#5c8bd6',
  border: 'none',
  borderRadius: '4px',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '14px'
};

export default ErrorBoundary;