import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ProjectProvider } from './context/ProjectContext'; // <--- Import this

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProjectProvider>  {/* <--- Wrap App */}
      <App />
    </ProjectProvider> {/* <--- Close Wrap */}
  </React.StrictMode>,
)