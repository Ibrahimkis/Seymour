import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { dbGet, dbSet } from "./projectDb";
import CustomModal from "../components/CustomModal";

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  // Default Project Structure
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

  const [projectData, setProjectData] = useState(defaultProject);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertType, setAlertType] = useState("alert");

  // Helper function to show alerts
  const showAlert = (message, title = "Alert", type = "alert") => {
    setAlertMessage(message);
    setAlertTitle(title);
    setAlertType(type);
    setShowAlertModal(true);
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

  // --- 1. LOAD FROM INDEXEDDB ON BOOT ---
  useEffect(() => {
    (async () => {
      try {
        const saved = await dbGet("seymour_data");
        if (saved) {
          if (!validateProject(saved)) {
            console.warn("⚠️ Corrupt save data detected. Using backup or defaults.");

            const backup = await dbGet("seymour_data_backup");
            if (backup && validateProject(backup)) {
              console.log("✅ Loaded from backup");
              setProjectData(safelyMergeProject(backup));
              setIsLoaded(true);
              return;
            }

            showAlert(
              "⚠️ Your save file appears corrupted. Starting fresh. Please load a backup if you have one.",
              "Corrupted Save File"
            );
            setIsLoaded(true);
            return;
          }

          setProjectData(safelyMergeProject(saved));
          console.log("✅ Project loaded successfully");
        }
      } catch (e) {
        console.error("❌ Failed to load from IndexedDB:", e);
        showAlert("Error loading project. Starting with a fresh project.", "Load Error");
      } finally {
        setIsLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 2. AUTO-SAVE WITH BACKUP (DEBOUNCED) ---
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      try {
        // Backup current save before overwriting
        const currentSave = await dbGet("seymour_data");
        if (currentSave) {
          await dbSet("seymour_data_backup", currentSave);
        }

        // Save new data
        await dbSet("seymour_data", projectData);
        console.log("💾 Saved to IndexedDB (with backup)");
      } catch (err) {
        console.error("❌ IndexedDB save failed:", err);
        showAlert("⚠️ Save failed. Your browser may be blocking storage.", "Save Error");
      }
    }, 600);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [projectData, isLoaded]);

  // Optional: save immediately when tab is hidden (extra safety)
  useEffect(() => {
    if (!isLoaded) return;

    const onVis = async () => {
      if (document.visibilityState === "hidden") {
        try {
          const currentSave = await dbGet("seymour_data");
          if (currentSave) await dbSet("seymour_data_backup", currentSave);
          await dbSet("seymour_data", projectData);
        } catch (e) {
          console.warn("visibility save failed:", e);
        }
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [projectData, isLoaded]);

  // --- 3. EXPORT / IMPORT ---
  const saveToDisk = async () => {
    try {
      // Check if browser supports modern File System Access API
      if ('showSaveFilePicker' in window) {
        // Modern browsers - shows proper "Save As" dialog
        const suggestedName = `${projectData.title || "project"}_${new Date().toISOString().slice(0, 10)}.json`;
        
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: suggestedName,
          types: [
            {
              description: 'Seymour Project Files',
              accept: { 'application/json': ['.json'] }
            }
          ]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(projectData, null, 2));
        await writable.close();
        
        console.log("✅ File saved successfully");
        
      } else {
        // Fallback for older browsers or when Electron isn't available yet
        const dataStr = JSON.stringify(projectData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${projectData.title || "project"}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log("✅ Exported to disk (fallback)");
      }
      
    } catch (err) {
      // User cancelled the save dialog
      if (err.name === 'AbortError') {
        console.log("Save cancelled by user");
        return;
      }
      
      console.error("❌ Export failed:", err);
      showAlert("Failed to export project.", "Export Error");
    }
  };

  const loadFromDisk = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);

        if (!validateProject(json)) {
          showAlert("❌ Invalid project file. Please check the file and try again.", "Invalid File");
          return;
        }

        setProjectData(safelyMergeProject(json));
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

  return (
    <ProjectContext.Provider value={{ user, projectData, setProjectData, saveToDisk, loadFromDisk }}>
      {children}
      <CustomModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
      />
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);