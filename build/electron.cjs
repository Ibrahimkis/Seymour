// public/electron.js
// Electron main process - creates the window and handles native features

const { app, BrowserWindow, Menu, dialog, shell, ipcMain, MenuItem } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const isDev = !app.isPackaged;

let mainWindow;
let fileToOpen = null;

// Handle file opening on Windows (double-click)
if (process.platform === 'win32' && process.argv.length >= 2) {
  const filePath = process.argv.find(arg => arg.endsWith('.seymour'));
  if (filePath) {
    fileToOpen = filePath;
  }
}

// Handle file opening on macOS
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  fileToOpen = filePath;
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('open-file', filePath);
  }
});

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
    show: false, // Don't show until ready (for splash screen)
    icon: path.join(__dirname, 'Seymourico.ico.ico'),
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

  // Show window when ready to display content
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // If a file was opened with the app, send it to the renderer
    if (fileToOpen) {
      mainWindow.webContents.send('open-file', fileToOpen);
      fileToOpen = null;
    }
  });

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

  // Handle window close - trigger save before closing
  mainWindow.on('close', (event) => {
    if (!mainWindow.isDestroyed() && mainWindow.webContents) {
      // Prevent immediate close
      event.preventDefault();
      
      // Request the renderer to save and then close
      mainWindow.webContents.send('app-closing');
      
      // Set a timeout to force close after 5 seconds if save doesn't complete
      setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.destroy();
        }
      }, 5000);
    }
  });

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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }
});

ipcMain.handle('is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Project file management IPC handlers
const projectsDir = path.join(app.getPath('userData'), 'projects');
const backupsDir = path.join(app.getPath('userData'), 'backups');

const atomicWriteJson = (targetPath, data) => {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = `${targetPath}.tmp`;
  const bakPath = `${targetPath}.bak`;

  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');

  try {
    if (fs.existsSync(bakPath)) {
      fs.rmSync(bakPath, { force: true });
    }

    if (fs.existsSync(targetPath)) {
      fs.renameSync(targetPath, bakPath);
    }

    fs.renameSync(tmpPath, targetPath);

    if (fs.existsSync(bakPath)) {
      fs.rmSync(bakPath, { force: true });
    }
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { force: true });
    } catch {}

    // Best-effort restore
    try {
      if (!fs.existsSync(targetPath) && fs.existsSync(bakPath)) {
        fs.renameSync(bakPath, targetPath);
      }
    } catch {}

    throw err;
  }
};

// Ensure directories exist
if (!fs.existsSync(projectsDir)) {
  fs.mkdirSync(projectsDir, { recursive: true });
}
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

ipcMain.handle('save-project-file', async (event, projectId, data) => {
  try {
    const filePath = path.join(projectsDir, `${projectId}.json`);
    atomicWriteJson(filePath, data);
    console.log(`✅ Saved project: ${projectId}`);
    return { success: true, filePath };
  } catch (err) {
    console.error('❌ Save failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-project-file', async (event, projectId) => {
  try {
    const filePath = path.join(projectsDir, `${projectId}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      console.log(`✅ Loaded project: ${projectId}`);
      return { success: true, data: JSON.parse(data), filePath };
    }
    return { success: false, error: 'Project not found' };
  } catch (err) {
    console.error('❌ Load failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('list-projects', async () => {
  try {
    const files = fs.readdirSync(projectsDir);
    const projects = files
      .filter(file => file.endsWith('.json') || file.endsWith('.seymour'))
      .map(file => {
        const projectId = file.replace(/\.(json|seymour)$/i, '');
        const filePath = path.join(projectsDir, file);
        const stats = fs.statSync(filePath);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return {
            id: projectId,
            title: data.title || 'Untitled',
            lastModified: stats.mtime,
          };
        } catch {
          return null;
        }
      })
      .filter(p => p !== null)
      .sort((a, b) => b.lastModified - a.lastModified);
    
    return { success: true, projects };
  } catch (err) {
    console.error('❌ List projects failed:', err);
    return { success: false, error: err.message, projects: [] };
  }
});

ipcMain.handle('delete-project', async (event, projectId) => {
  try {
    const filePath = path.join(projectsDir, `${projectId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted project: ${projectId}`);
      return { success: true };
    }
    return { success: false, error: 'Project not found' };
  } catch (err) {
    console.error('❌ Delete failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-project-to-path', async (event, filePath, data) => {
  try {
    // Ensure .seymour extension
    if (!filePath.endsWith('.seymour')) {
      filePath = filePath.replace(/\.json$/i, '.seymour');
      if (!filePath.endsWith('.seymour')) {
        filePath += '.seymour';
      }
    }
    atomicWriteJson(filePath, data);
    console.log(`✅ Saved project to: ${filePath}`);
    return { success: true, filePath };
  } catch (err) {
    console.error('❌ Save to path failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Project Directory',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    return { success: true, directoryPath: result.filePaths[0] };
  } catch (err) {
    console.error('❌ Directory selection failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-project-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Project',
      properties: ['openFile'],
      filters: [
        { name: 'Seymour Projects', extensions: ['seymour', 'json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    const data = fs.readFileSync(filePath, 'utf8');
    console.log(`✅ Opened project from: ${filePath}`);
    
    return { success: true, filePath, data };
  } catch (err) {
    console.error('❌ Open project failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-project-as', async (event, data) => {
  try {
    const suggestedName = `${data.title || 'project'}.seymour`;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Project As',
      defaultPath: suggestedName,
      filters: [
        { name: 'Seymour Project', extensions: ['seymour'] },
        { name: 'JSON Files', extensions: ['json'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePath;
    atomicWriteJson(filePath, data);
    console.log(`✅ Saved project as: ${filePath}`);
    return { success: true, filePath };
  } catch (err) {
    console.error('❌ Save As failed:', err);
    return { success: false, error: err.message };
  }
});

// Save text backup of manuscript
ipcMain.handle('save-text-backup', async (event, filePath, chapters) => {
  try {
    // Convert chapters to plain text
    let textContent = '';
    
    if (chapters && chapters.length > 0) {
      chapters.forEach((chapter, index) => {
        textContent += `${'='.repeat(80)}\n`;
        textContent += `CHAPTER ${index + 1}: ${chapter.title || 'Untitled'}\n`;
        textContent += `${'='.repeat(80)}\n\n`;
        
        // Strip HTML tags from content
        const plainText = (chapter.content || '')
          .replace(/<\/p>/g, '\n\n')
          .replace(/<br\s*\/?>/g, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        
        textContent += plainText.trim();
        textContent += '\n\n\n';
      });
    } else {
      textContent = 'No chapters found in this project.\n';
    }
    
    // Determine backup file path
    let backupPath;
    if (filePath) {
      // Save next to the Seymour file
      backupPath = filePath.replace(/\.(json|seymour)$/i, '.txt');
    } else {
      // Use default backup directory
      backupPath = path.join(backupsDir, 'manuscript_backup.txt');
    }
    
    fs.writeFileSync(backupPath, textContent, 'utf8');
    console.log(`📝 Text backup saved to: ${backupPath}`);
    
    return { success: true, backupPath };
  } catch (error) {
    console.error('Error saving text backup:', error);
    return { success: false, error: error.message };
  }
});

// Spell check cache - populated by context-menu event
let spellCheckCache = new Map();

// Renderer-reported last right-clicked word (per webContents.id)
const lastContextWordByWebContents = new Map();

ipcMain.on('report-context-word', (event, payload) => {
  try {
    const wc = event.sender;
    const word = String(payload?.word || '').trim();
    if (!wc || !word) return;
    lastContextWordByWebContents.set(wc.id, { word, ts: Date.now() });
  } catch {}
});

// Spell check IPC handlers
ipcMain.handle('check-spelling', async (event, word) => {
  if (!mainWindow || !word) return false;
  
  // Check cache from context-menu event
  if (spellCheckCache.has(word)) {
    const cached = spellCheckCache.get(word);
    return cached.isMisspelled;
  }
  
  return false;
});

ipcMain.handle('get-spelling-suggestions', async (event, word) => {
  if (!mainWindow || !word) return [];
  
  // Get suggestions from cache
  if (spellCheckCache.has(word)) {
    const cached = spellCheckCache.get(word);
    return cached.suggestions || [];
  }
  
  return [];
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
                  atomicWriteJson(result.filePath, projectData);
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
                  atomicWriteJson(result.filePath, projectData);
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

    // Cache spell check data for IPC handlers
    if (params.misspelledWord) {
      spellCheckCache.set(params.misspelledWord, {
        isMisspelled: true,
        suggestions: params.dictionarySuggestions || []
      });
    }
    
    // Also cache that selected text is NOT misspelled if checked
    if (params.selectionText && !params.misspelledWord) {
      const word = params.selectionText.trim();
      if (word && word.split(/\s+/).length === 1) {
        spellCheckCache.set(word, {
          isMisspelled: false,
          suggestions: []
        });
      }
    }

    // Notify renderer so custom context menus can display suggestions without racing IPC calls.
    // Note: coords are in the page/client coordinate space and should match renderer's clientX/clientY.
    // Send from the originating webContents so the right renderer always receives it.
    if (contents && !contents.isDestroyed()) {
      contents.send('spellcheck-context', {
        x: params.x,
        y: params.y,
        misspelledWord: params.misspelledWord || null,
        suggestions: params.dictionarySuggestions || [],
        selectionText: params.selectionText || '',
        isEditable: !!params.isEditable,
      });
    }

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

    // Lore actions: when inside an editable field.
    // Use selected text if present, otherwise use misspelledWord, otherwise fall back to
    // the renderer-reported last right-clicked word.
    const selected = (params.selectionText || '').trim();
    const misspelled = (params.misspelledWord || '').trim();
    let loreText = selected || misspelled;

    if (!loreText && contents && !contents.isDestroyed()) {
      const cached = lastContextWordByWebContents.get(contents.id);
      if (cached?.word && Date.now() - (cached.ts || 0) < 1500) {
        loreText = cached.word;
      }
    }

    if (params.isEditable && loreText) {
      const preview = loreText.length > 30 ? `${loreText.slice(0, 30)}...` : loreText;

      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: `Create Lore Card from "${preview}"`,
        click: () => {
          if (contents && !contents.isDestroyed()) {
            contents.send('native-context-lore', { action: 'create', text: loreText });
          }
        }
      }));
      menu.append(new MenuItem({
        label: 'Add to Existing Lore Card',
        click: () => {
          if (contents && !contents.isDestroyed()) {
            contents.send('native-context-lore', { action: 'addTo', text: loreText });
          }
        }
      }));
    }

    // Only show if we have items
    if (menu.items.length > 0) {
      menu.popup();
    }
  });
});