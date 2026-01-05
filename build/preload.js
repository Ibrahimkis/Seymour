const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window control APIs
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),

  // IPC event listeners
  onMenuNewProject: (callback) => ipcRenderer.on('menu-new-project', callback),
  onMenuLoadProject: (callback) => ipcRenderer.on('menu-load-project', callback),
  onMenuSaveProject: (callback) => ipcRenderer.on('menu-save-project', callback),
  onMenuSaveProjectAs: (callback) => ipcRenderer.on('menu-save-project-as', callback),
  onMenuGetProjectData: (callback) => ipcRenderer.on('menu-get-project-data', callback),
  onMenuExport: (callback) => ipcRenderer.on('menu-export', callback),
  onMenuFind: (callback) => ipcRenderer.on('menu-find', callback),
  onMenuToggleTheme: (callback) => ipcRenderer.on('menu-toggle-theme', callback),
  onMenuZenMode: (callback) => ipcRenderer.on('menu-zen-mode', callback),

  // Send project data to main process
  sendProjectData: (data) => ipcRenderer.send('project-data-response', data),

  // Remove listeners when component unmounts
  removeAllListeners: (event) => ipcRenderer.removeAllListeners(event),

  // File system APIs (add as needed)
  // openFile: () => ipcRenderer.invoke('open-file'),
  // saveFile: (data) => ipcRenderer.invoke('save-file', data),

  // Add more APIs here as your app requires them
  // For example, if you need to communicate with Firebase or handle app-specific events
});