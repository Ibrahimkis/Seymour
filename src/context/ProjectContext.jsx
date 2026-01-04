import React, { createContext, useContext, useState, useEffect } from 'react';
// 1. Import Firebase modules
import { auth, db, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  // --- AUTH STATE ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Auth is checking status
  const [dataLoading, setDataLoading] = useState(false); // Data is downloading

  // --- DEFAULT PROJECT STRUCTURE ---
  // This ensures new users (or logged out users) start with your template
  const defaultProject = {
    title: "Untitled Project",
    globalNotes: "",
    settings: {
      fontSize: 18,
      zoom: 100,
      fontFamily: 'serif',
      customFonts: [] 
    },
    manuscript: {
      chapters: [
        { 
          id: 1, 
          title: "Chapter 1", 
          content: "<p>Once upon a time...</p>",
          synopsis: "",
          notes: ""
        }
      ]
    },
    lore: {
      characters: [],
      folders: [
        { id: 'root_char', name: 'Characters', parentId: null, isOpen: true },
        { id: 'root_loc', name: 'Locations', parentId: null, isOpen: true },
        { id: 'root_misc', name: 'Unsorted', parentId: null, isOpen: true },
      ]
    },
    worldMap: { imageSrc: null, pins: [] },
    timeline: [],
    relationships: []
  };

  const [projectData, setProjectData] = useState(defaultProject);

  // --- 1. AUTH LISTENER & CLOUD SYNC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        console.log("👤 User logged in:", currentUser.email);
        setDataLoading(true);
        const docRef = doc(db, "users", currentUser.uid);
        
        // SUBSCRIBE TO CLOUD DATA (Real-time)
        const unsubDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            // Merge cloud data with default structure to ensure no missing fields
            const cloudData = docSnap.data();
            setProjectData(prev => ({
              ...defaultProject, 
              ...cloudData,
              // Deep merge settings/manuscript if needed, or rely on cloud being source of truth
              settings: { ...defaultProject.settings, ...(cloudData.settings || {}) },
              manuscript: { ...defaultProject.manuscript, ...(cloudData.manuscript || {}) },
              lore: { ...defaultProject.lore, ...(cloudData.lore || {}) }
            }));
          } else {
            // First time user? Create their DB entry
            setDoc(docRef, defaultProject);
          }
          setDataLoading(false);
        });
        
        return () => unsubDoc();
      } else {
        // User logged out? Reset to defaults
        setProjectData(defaultProject);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- 2. AUTO-SAVE TO CLOUD ---
  useEffect(() => {
    // Only save if logged in and strictly NOT during initial load
    if (!user || dataLoading) return;

    const saveData = setTimeout(async () => {
      const docRef = doc(db, "users", user.uid);
      try {
        await setDoc(docRef, projectData, { merge: true });
        console.log("☁️ Auto-saved to Cloud");
      } catch (e) {
        console.error("Error saving to cloud:", e);
      }
    }, 2000); // 2-second debounce

    return () => clearTimeout(saveData);
  }, [projectData, user, dataLoading]);

  // --- 3. AUTH ACTIONS ---
  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed: " + error.message);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProjectData(defaultProject);
  };

  // --- 4. EXPORT TO FILE (Backup) ---
  const saveToDisk = () => {
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectData.title || 'seymour_backup'}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 5. IMPORT FROM FILE (Restore) ---
  const loadFromDisk = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        setProjectData(json);
        // If logged in, force an immediate cloud save so the restore persists
        if (user) {
           const docRef = doc(db, "users", user.uid);
           await setDoc(docRef, json); 
        }
        alert("Project loaded successfully!");
      } catch (err) {
        alert("Error reading file.");
      }
    };
    reader.readAsText(file);
  };

  // --- RENDER ---
  return (
    <ProjectContext.Provider value={{ 
      user,
      loading, // Auth loading state
      login,
      logout,
      projectData, 
      setProjectData, 
      saveToDisk, 
      loadFromDisk 
    }}>
      {!loading && children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);