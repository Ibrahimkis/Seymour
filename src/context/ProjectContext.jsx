import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import CustomModal from "../components/CustomModal";

const ProjectContext = createContext();

// Default Project Structure (moved outside to prevent recreation)
const defaultProject = {
  title: "Untitled Project",
  globalNotes: "",
  settings: {
    fontSize: 18,
    zoom: 100,
    fontFamily: "serif",
    customFonts: [],
  },
  manuscript: {
    chapters: [
      {
        id: 1,
        title: "Chapter 1",
        content: "<p>Once upon a time...</p>",
        synopsis: "",
        notes: "",
      },
    ],
  },
  lore: {
    characters: [],
    folders: [
      { id: "root_char", name: "Characters", parentId: null, isOpen: true },
      { id: "root_loc", name: "Locations", parentId: null, isOpen: true },
      { id: "root_misc", name: "Unsorted", parentId: null, isOpen: true },
    ],
  },
  worldMap: { imageSrc: null, pins: [] },
  timeline: [],
  relationships: [],
};

export const ProjectProvider = ({ children }) => {
  const [projectData, setProjectDataState] = useState(defaultProject);
  
  // Use ref to access latest projectData without dependency issues
  const projectDataRef = useRef(projectData);
  useEffect(() => {
    projectDataRef.current = projectData;
  }, [projectData]);
  
  const [projectId, setProjectId] = useState(() => {
    return localStorage.getItem('currentProjectId') || 'default-project';
  });
  const [projectFilePath, setProjectFilePath] = useState(() => {
    return localStorage.getItem('currentProjectFilePath') || null;
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertType, setAlertType] = useState("alert");
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const projectIdRef = useRef(projectId);
  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  const projectFilePathRef = useRef(projectFilePath);
  useEffect(() => {
    projectFilePathRef.current = projectFilePath;
  }, [projectFilePath]);

  const isLoadedRef = useRef(isLoaded);
  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

  const autoSaveEnabledRef = useRef(autoSaveEnabled);
  useEffect(() => {
    autoSaveEnabledRef.current = autoSaveEnabled;
  }, [autoSaveEnabled]);

  const saveStatusRef = useRef(saveStatus);
  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  // Save pipeline
  const changeSeqRef = useRef(0);
  const saveQueueRef = useRef(Promise.resolve());
  const pendingDebounceRef = useRef(null);
  const hydratingRef = useRef(true);

  const buildSavePath = (dataToSave) => {
    const existingPath = projectFilePathRef.current;
    if (existingPath) return existingPath;
    if (dataToSave?.projectPath) return `${dataToSave.projectPath}/${dataToSave.title}.json`;
    return null;
  };

  const persistToDisk = useCallback(async (dataOverride = null) => {
    if (!window.electronAPI) return { success: false, error: 'Not running in Electron' };
    if (!isLoadedRef.current) return { success: false, error: 'Not loaded' };

    const dataToSave = dataOverride || projectDataRef.current;
    const savePathToUse = buildSavePath(dataToSave);

    let result;
    if (savePathToUse) {
      result = await window.electronAPI.saveProjectToPath(savePathToUse, dataToSave);
    } else {
      result = await window.electronAPI.saveProjectFile(projectIdRef.current, dataToSave);
    }

    if (result?.success && result?.filePath) {
      if (!projectFilePathRef.current) {
        setProjectFilePath(result.filePath);
      }
      await window.electronAPI.saveTextBackup(result.filePath, dataToSave.manuscript?.chapters);
    }

    return result;
  }, []);

  const flushSaveNow = useCallback(async ({ dataOverride = null, setSavingStatus = true } = {}) => {
    if (pendingDebounceRef.current) {
      clearTimeout(pendingDebounceRef.current);
      pendingDebounceRef.current = null;
    }

    const seqAtRequest = changeSeqRef.current;

    // If nothing has changed and we're not forcing a specific snapshot, skip.
    if (!dataOverride && seqAtRequest === 0) return;

    saveQueueRef.current = saveQueueRef.current
      .then(async () => {
        // If something newer is already marked dirty, prefer latest at execution time.
        const seqAtExecution = changeSeqRef.current;
        if (!dataOverride && seqAtExecution === 0) return;

        if (setSavingStatus && saveStatusRef.current !== 'Saving...') {
          setSaveStatus('Saving...');
        }

        const result = await persistToDisk(dataOverride);
        if (!result?.success) {
          // Keep dirty state (seq) as-is so we retry later.
          if (setSavingStatus) setSaveStatus('Unsaved changes...');
          return;
        }

        // Only mark "Saved" if no additional changes occurred since the save request.
        if (!dataOverride && changeSeqRef.current === seqAtRequest) {
          changeSeqRef.current = 0;
          setSaveStatus('Saved');
        } else if (dataOverride && changeSeqRef.current === 0) {
          setSaveStatus('Saved');
        } else {
          // Changes happened during/after save; schedule another debounce.
          setSaveStatus('Unsaved changes...');
          if (autoSaveEnabledRef.current) {
            pendingDebounceRef.current = setTimeout(() => {
              flushSaveNow({ setSavingStatus: false });
            }, 500);
          }
        }
      })
      .catch((err) => {
        console.warn('save queue failed:', err);
        if (setSavingStatus) setSaveStatus('Unsaved changes...');
      });

    return saveQueueRef.current;
  }, [persistToDisk]);

  const scheduleDebouncedSave = useCallback((delayMs = 700) => {
    if (!window.electronAPI) return;
    if (!isLoadedRef.current) return;
    if (!autoSaveEnabledRef.current) return;

    if (pendingDebounceRef.current) clearTimeout(pendingDebounceRef.current);
    pendingDebounceRef.current = setTimeout(() => {
      flushSaveNow({ setSavingStatus: false });
    }, delayMs);
  }, [flushSaveNow]);

  const setProjectData = useCallback((updater, options = {}) => {
    setProjectDataState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });

    if (options.skipDirty || hydratingRef.current) return;

    changeSeqRef.current += 1;
    if (saveStatusRef.current === 'Saved') {
      setSaveStatus('Unsaved changes...');
    }
    scheduleDebouncedSave();
  }, [scheduleDebouncedSave]);

  // Track current project ID in localStorage
  useEffect(() => {
    localStorage.setItem('currentProjectId', projectId);
    if (projectFilePath) {
      localStorage.setItem('currentProjectFilePath', projectFilePath);
    } else {
      localStorage.removeItem('currentProjectFilePath');
    }
  }, [projectId, projectFilePath]);

  // Sync autoSave changes to localStorage
  useEffect(() => {
    localStorage.setItem('autoSaveEnabled', JSON.stringify(autoSaveEnabled));
  }, [autoSaveEnabled]);

  // Helper function to show alerts
  const showAlert = (message, title = "Alert", type = "alert") => {
    setAlertMessage(message);
    setAlertTitle(title);
    setAlertType(type);
    setShowAlertModal(true);
  };

  const inferProjectTitle = (existingTitle, filePath, fallbackProjectId) => {
    const normalizedExisting = typeof existingTitle === 'string' ? existingTitle.trim() : '';
    if (normalizedExisting && normalizedExisting.toLowerCase() !== 'untitled project') return normalizedExisting;

    if (filePath && typeof filePath === 'string') {
      const base = filePath.split(/[\\/]/).pop() || '';
      const withoutExt = base.replace(/\.(json|seymour)$/i, '').trim();
      if (withoutExt) return withoutExt;
    }

    if (fallbackProjectId && typeof fallbackProjectId === 'string') {
      const fromId = fallbackProjectId
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
      if (fromId && fromId.toLowerCase() !== 'default project') return fromId;
    }

    return defaultProject.title;
  };

  // --- VALIDATION HELPER ---
  const validateProject = (data) => {
    try {
      if (!data || typeof data !== "object") return false;
      if (!data.manuscript || !Array.isArray(data.manuscript.chapters)) return false;
      if (!data.lore || !Array.isArray(data.lore.characters)) return false;

      for (let chapter of data.manuscript.chapters) {
        if (!chapter.id || !chapter.title || !chapter.content) return false;
      }
      return true;
    } catch (err) {
      console.error("Validation error:", err);
      return false;
    }
  };

  // --- SAFE MERGE HELPER ---
  const safelyMergeProject = (saved) => {
    return {
      ...defaultProject,
      ...saved,
      manuscript: {
        ...defaultProject.manuscript,
        ...(saved.manuscript || {}),
      },
      lore: {
        ...defaultProject.lore,
        ...(saved.lore || {}),
        folders: saved.lore?.folders || defaultProject.lore.folders,
        characters: saved.lore?.characters || [],
      },
      settings: {
        ...defaultProject.settings,
        ...(saved.settings || {}),
      },
      timeline: Array.isArray(saved.timeline) ? saved.timeline : [],
      relationships: Array.isArray(saved.relationships) ? saved.relationships : [],
    };
  };

  // --- 1. LOAD FROM FILE SYSTEM ON BOOT ---
  useEffect(() => {
    (async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.loadProjectFile(projectId);
          if (result.success && result.data) {
            if (!validateProject(result.data)) {
              console.warn("⚠️ Corrupt save data detected.");
              showAlert(
                "⚠️ Your save file appears corrupted. Starting fresh.",
                "Corrupted Save File"
              );
              setIsLoaded(true);
              return;
            }

            if (result.filePath) {
              setProjectFilePath(result.filePath);
            }

            const merged = safelyMergeProject(result.data);
            const inferredTitle = inferProjectTitle(merged.title, result.filePath || null, projectId);
            hydratingRef.current = true;
            changeSeqRef.current = 0;
            setProjectData({ ...merged, title: inferredTitle }, { skipDirty: true });
            setSaveStatus('Saved');
            console.log("✅ Project loaded successfully");
          } else {
            console.log("No existing project found, starting fresh");
          }
        }
      } catch (e) {
        console.error("❌ Failed to load project:", e);
        showAlert("Error loading project. Starting with a fresh project.", "Load Error");
      } finally {
        setIsLoaded(true);
        hydratingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Flush saves on important lifecycle events
  useEffect(() => {
    if (!window.electronAPI) return;

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        flushSaveNow({ setSavingStatus: false });
      }
    };

    const onBeforeUnload = () => {
      // Cannot reliably await here, but starting the flush is still better than nothing.
      flushSaveNow({ setSavingStatus: false });
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [flushSaveNow]);

  // Flush saves when features request it (navigation/click-away)
  useEffect(() => {
    const handler = () => {
      flushSaveNow({ setSavingStatus: false });
    };
    window.addEventListener('force-save-all', handler);
    window.addEventListener('force-save-lore', handler);
    window.addEventListener('force-save-chapter', handler);
    return () => {
      window.removeEventListener('force-save-all', handler);
      window.removeEventListener('force-save-lore', handler);
      window.removeEventListener('force-save-chapter', handler);
    };
  }, [flushSaveNow]);

  // --- 3. QUICK SAVE (no dialog) ---
  const saveToCurrentPath = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const result = await persistToDisk(projectDataRef.current);
        if (result?.success) {
          showAlert("✅ Project saved successfully!", "Success");
          changeSeqRef.current = 0;
          setSaveStatus('Saved');
        } else {
          showAlert("Failed to save project.", "Save Error");
        }
      } else {
        // Fallback for browser
        const dataStr = JSON.stringify(projectData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${projectData.title || "project"}_${new Date().toISOString().slice(0, 10)}.seymour`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("❌ Save failed:", err);
      showAlert("⚠️ Save failed.", "Save Error");
    }
  }, [persistToDisk]);

  // --- 4. EXPORT / SAVE AS (with dialog) ---
  const saveToDisk = useCallback(async () => {
    try {
      if (window.electronAPI) {
        // Use Electron's native save dialog
        const result = await window.electronAPI.saveProjectAs(projectData);
        
        if (result.canceled) {
          console.log("Save cancelled by user");
          return;
        }
        
        if (result.success) {
          // Update the project file path to the new location
          const newFilePath = result.filePath;
          const fileName = newFilePath.split(/[\\/]/).pop().replace(/\.(json|seymour)$/i, '');
          const newProjectId = fileName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
          
          setProjectFilePath(newFilePath);
          setProjectId(newProjectId);

          changeSeqRef.current = 0;
          setSaveStatus('Saved');
          
          console.log("✅ File saved successfully to:", newFilePath);
          showAlert("✅ Project saved successfully!", "Success");
        } else {
          showAlert("Failed to save project.", "Save Error");
        }
      } else {
        // Fallback for browser (shouldn't happen in native app)
        const dataStr = JSON.stringify(projectData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${projectData.title || "project"}_${new Date().toISOString().slice(0, 10)}.seymour`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log("✅ Exported to disk (fallback)");
      }
      
    } catch (err) {
      console.error("❌ Export failed:", err);
      showAlert("Failed to export project.", "Export Error");
    }
  }, [projectData]);

  // --- 4b. IMMEDIATE SAVE (silent, no dialogs) ---
  const saveNowSilently = useCallback(async (dataOverride = null) => {
    return flushSaveNow({ dataOverride, setSavingStatus: false });
  }, [flushSaveNow]);

  const loadFromDisk = (file, explicitFilePath = null) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);

        if (!validateProject(json)) {
          showAlert("❌ Invalid project file. Please check the file and try again.", "Invalid File");
          return;
        }

        // Use explicit file path (from Electron dialog) or try to get from file object
        const filePath = explicitFilePath || file.path || null;
        const fileName = file.name.replace(/\.(json|seymour)$/i, '');
        const newProjectId = fileName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

        json.title = inferProjectTitle(json.title, filePath, newProjectId);
        
        // Switch to loaded project
        setProjectId(newProjectId);
        setProjectFilePath(filePath);
        const merged = safelyMergeProject(json);
        hydratingRef.current = true;
        changeSeqRef.current = 0;
        setProjectData({ ...merged, title: inferProjectTitle(merged.title, filePath, newProjectId) }, { skipDirty: true });
        setSaveStatus('Saved');
        setIsLoaded(true);
        hydratingRef.current = false;
        console.log(`✅ Loaded project from: ${filePath || 'file input'}`);
        showAlert("✅ Project loaded successfully!", "Success");
      } catch (err) {
        console.error("❌ Import failed:", err);
        showAlert("Error reading file. Make sure it's a valid Seymour project.", "Import Error");
      }
    };
    reader.onerror = () => showAlert("Failed to read file.", "File Read Error");
    reader.readAsText(file);
  };

  const user = { uid: "offline-user", email: "offline@local" };

  const contextValue = useMemo(() => ({
    user,
    projectData,
    setProjectData,
    saveToDisk,
    saveToCurrentPath,
    saveNowSilently,
    loadFromDisk,
    saveStatus,
    setSaveStatus,
    autoSaveEnabled,
    setAutoSaveEnabled,
    projectId,
    setProjectId,
    projectFilePath,
    setProjectFilePath
  }), [projectData, setProjectData, saveToDisk, saveToCurrentPath, saveNowSilently, saveStatus, autoSaveEnabled, projectId, projectFilePath]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
      <CustomModal
        isOpen={showAlertModal}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => setShowAlertModal(false)}
        onCancel={() => setShowAlertModal(false)}
      />
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);