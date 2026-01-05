// public/electron.js
// Electron main process - creates the window and handles native features

const { app, BrowserWindow, Menu, dialog, shell, ipcMain, MenuItem } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hiddenInset', // macOS style
    autoHideMenuBar: true, // Hide the native menu bar
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      spellcheck: true, // Enable spell check
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Set spell checker languages
  mainWindow.webContents.session.setSpellCheckerLanguages(['en-US']);

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create custom menu
  // createMenu(); // Disabled - using custom menu bar instead

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers for window controls
ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Add more IPC handlers here as needed

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-project');
          }
        },
        { type: 'separator' },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Seymour Projects', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
              const data = fs.readFileSync(result.filePaths[0], 'utf8');
              mainWindow.webContents.send('menu-load-project', data);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save-project');
          }
        },
        {
          label: 'Save Project As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            // Request project data from renderer
            mainWindow.webContents.send('menu-get-project-data');
            
            // Listen for the response with project data
            const handleProjectData = async (event, projectData) => {
              ipcMain.removeListener('project-data-response', handleProjectData);
              
              const result = await dialog.showSaveDialog(mainWindow, {
                defaultPath: `${projectData.title || 'project'}_${new Date().toISOString().slice(0, 10)}.json`,
                filters: [
                  { name: 'Seymour Projects', extensions: ['json'] },
                  { name: 'All Files', extensions: ['*'] }
                ]
              });
              
              if (!result.canceled && result.filePath) {
                try {
                  fs.writeFileSync(result.filePath, JSON.stringify(projectData, null, 2));
                  console.log('✅ Project saved successfully to:', result.filePath);
                } catch (err) {
                  console.error('❌ Failed to save project:', err);
                  dialog.showErrorBox('Save Error', 'Failed to save the project file.');
                }
              }
            };
            
            ipcMain.once('project-data-response', handleProjectData);
          }
        },
        { type: 'separator' },
        {
          label: 'Export Manuscript...',
          click: async () => {
            // Request project data from renderer
            mainWindow.webContents.send('menu-get-project-data');
            
            // Listen for the response with project data
            const handleProjectData = async (event, projectData) => {
              ipcMain.removeListener('project-data-response', handleProjectData);
              
              const result = await dialog.showSaveDialog(mainWindow, {
                defaultPath: `${projectData.title || 'manuscript'}_${new Date().toISOString().slice(0, 10)}.json`,
                filters: [
                  { name: 'Seymour Projects', extensions: ['json'] },
                  { name: 'All Files', extensions: ['*'] }
                ]
              });
              
              if (!result.canceled && result.filePath) {
                try {
                  fs.writeFileSync(result.filePath, JSON.stringify(projectData, null, 2));
                  console.log('✅ Manuscript exported successfully to:', result.filePath);
                } catch (err) {
                  console.error('❌ Failed to export manuscript:', err);
                  dialog.showErrorBox('Export Error', 'Failed to export the manuscript.');
                }
              }
            };
            
            ipcMain.once('project-data-response', handleProjectData);
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('menu-find');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Dark/Light Mode',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            mainWindow.webContents.send('menu-toggle-theme');
          }
        },
        {
          label: 'Zen Mode',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => {
            mainWindow.webContents.send('menu-zen-mode');
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Seymour',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Seymour',
              message: 'Seymour - World Building & Writing Tool',
              detail: 'Version 1.0.0\n\nThe ultimate tool for writers and world builders.\n\n© 2025'
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            shell.openExternal('https://github.com/yourusername/seymour');
          }
        }
      ]
    }
  ];

  // macOS specific menu items
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Fetch synonyms from Datamuse API
function fetchSynonyms(word) {
  return new Promise((resolve, reject) => {
    const url = `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=10`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          const synonyms = results.map(item => item.word).slice(0, 8); // Limit to 8 suggestions
          resolve(synonyms);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle context menu with spell check
app.on('web-contents-created', (event, contents) => {
  contents.on('context-menu', async (event, params) => {
    const menu = new Menu();

    // Add spell check suggestions
    if (params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => contents.replaceMisspelling(suggestion)
        }));
      }

      if (params.dictionarySuggestions.length > 0) {
        menu.append(new MenuItem({ type: 'separator' }));
      }

      menu.append(new MenuItem({
        label: 'Add to Dictionary',
        click: () => contents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      }));

      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Add thesaurus/synonym suggestions for selected words
    if (params.selectionText && params.selectionText.trim().split(/\s+/).length === 1) {
      const selectedWord = params.selectionText.trim();
      
      try {
        const synonyms = await fetchSynonyms(selectedWord);
        
        if (synonyms.length > 0) {
          const synonymSubmenu = synonyms.map(synonym => ({
            label: synonym,
            click: () => {
              // Replace the selected text with the synonym
              contents.insertText(synonym);
            }
          }));

          menu.append(new MenuItem({
            label: '✨ Synonyms',
            submenu: synonymSubmenu
          }));
          
          menu.append(new MenuItem({ type: 'separator' }));
        }
      } catch (error) {
        console.error('Failed to fetch synonyms:', error);
      }
    }

    // Standard editing options
    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'cut' }));
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ role: 'paste' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
    } else if (params.selectionText) {
      menu.append(new MenuItem({ role: 'copy' }));
    }

    // Only show if we have items
    if (menu.items.length > 0) {
      menu.popup();
    }
  });
});