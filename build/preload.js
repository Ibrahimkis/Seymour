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
  
  // File opening from double-click
  onOpenFile: (callback) => ipcRenderer.on('open-file', (event, filePath) => callback(filePath)),
  
  // App closing event
  onAppClosing: (callback) => ipcRenderer.on('app-closing', callback),

  // Send project data to main process
  sendProjectData: (data) => ipcRenderer.send('project-data-response', data),

  // Remove listeners when component unmounts
  removeAllListeners: (event) => ipcRenderer.removeAllListeners(event),

  // File system APIs for project management
  saveProjectFile: (projectId, data) => ipcRenderer.invoke('save-project-file', projectId, data),
  saveProjectToPath: (filePath, data) => ipcRenderer.invoke('save-project-to-path', filePath, data),
  saveProjectAs: (data) => ipcRenderer.invoke('save-project-as', data),
  openProjectDialog: () => ipcRenderer.invoke('open-project-dialog'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  loadProjectFile: (projectId) => ipcRenderer.invoke('load-project-file', projectId),
  listProjects: () => ipcRenderer.invoke('list-projects'),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),
  saveTextBackup: (filePath, chapters) => ipcRenderer.invoke('save-text-backup', filePath, chapters),

  // Spell check APIs
  checkSpelling: (word) => ipcRenderer.invoke('check-spelling', word),
  getSpellingSuggestions: (word) => ipcRenderer.invoke('get-spelling-suggestions', word),

  // Spellcheck context events (from main process context-menu)
  onSpellCheckContext: (callback) => ipcRenderer.on('spellcheck-context', (_event, payload) => callback(payload)),

  // Native context menu lore actions
  onNativeContextLore: (callback) => ipcRenderer.on('native-context-lore', (_event, payload) => callback(payload)),

  // Renderer -> main: report last right-clicked word (for native context menu actions)
  reportContextWord: (payload) => ipcRenderer.send('report-context-word', payload),

  // Add more APIs here as your app requires them
  // For example, if you need to communicate with Firebase or handle app-specific events
});