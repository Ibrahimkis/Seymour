import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapCanvas from '../../components/MapCanvas'; 
import CustomModal from '../../components/CustomModal';
import { useProject } from '../../context/ProjectContext';
import { compressImage } from '../../utils/imageCompression';

const WorldMapPage = () => {
  const { projectData, setProjectData } = useProject();
  const navigate = useNavigate();
  
  // --- 1. DATA MIGRATION & INITIALIZATION ---
  // Check if worldMap is the old object format or new array format
  const rawData = projectData.worldMap || { imageSrc: null, pins: [] };
  
  const maps = Array.isArray(rawData) 
    ? rawData 
    : [ { id: 'default', name: 'Global Map', imageSrc: rawData.imageSrc, pins: rawData.pins || [] } ];

  // --- STATE ---
  const [activeMapId, setActiveMapId] = useState(maps[0].id);
  
  // Get active map data
  const currentMap = maps.find(m => m.id === activeMapId) || maps[0];
  const allEntities = projectData.lore.characters || [];

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, type: 'input', title: '', message: '', onConfirm: () => {} });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  // --- HELPER: UPDATE ACTIVE MAP ---
  const updateCurrentMap = (updates) => {
    // updates = { imageSrc: '...', pins: [...] }
    const newMaps = maps.map(m => 
      m.id === activeMapId ? { ...m, ...updates } : m
    );
    setProjectData(prev => ({ ...prev, worldMap: newMaps }));
  };

  // --- TAB MANAGEMENT ---
  const createNewTab = () => {
    setModal({
      isOpen: true, type: 'input', title: 'New Map Name', message: 'e.g. "Capital City"',
      onConfirm: (name) => {
        const newMap = { 
          id: Date.now(), 
          name: name || 'Untitled Map', 
          imageSrc: null, 
          pins: [] 
        };
        setProjectData(prev => ({ 
          ...prev, 
          worldMap: [...(Array.isArray(prev.worldMap) ? prev.worldMap : maps), newMap] 
        }));
        setActiveMapId(newMap.id);
        closeModal();
      }
    });
  };

  const renameTab = (mapId) => {
    setModal({
      isOpen: true, type: 'input', title: 'Rename Map', message: 'Enter new name:',
      onConfirm: (name) => {
        if (!name) return closeModal();
        const newMaps = maps.map(m => m.id === mapId ? { ...m, name } : m);
        setProjectData(prev => ({ ...prev, worldMap: newMaps }));
        closeModal();
      }
    });
  };

  const deleteTab = (mapId, e) => {
    e.stopPropagation();
    if (maps.length === 1) return alert("Cannot delete the last map.");
    setModal({
      isOpen: true, type: 'confirm', title: 'Delete Map', message: 'Are you sure? All pins on this map will be lost.',
      onConfirm: () => {
        const newMaps = maps.filter(m => m.id !== mapId);
        setProjectData(prev => ({ ...prev, worldMap: newMaps }));
        setActiveMapId(newMaps[0].id);
        closeModal();
      }
    });
  };

  // --- MAP HANDLERS ---
  const handleMapUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
  console.log(`📁 Original map size: ${fileSizeMB}MB`);
  
  try {
    // For maps, use higher resolution since detail matters
    const compressedImage = await compressImage(file, 1920, 1920, 0.8);
    updateCurrentMap({ imageSrc: compressedImage });
    
  } catch (err) {
    console.error('Map compression failed:', err);
    alert('Failed to upload map. Please try a smaller file.');
  }
};

  const handleAddPin = (newPin) => {
    const pinWithId = { ...newPin, id: newPin.id || Date.now() };
    updateCurrentMap({ pins: [...currentMap.pins, pinWithId] });
  };

  const handleRemovePin = (index) => {
    setModal({
      isOpen: true, type: 'confirm', title: 'Delete Pin', message: 'Remove this pin?',
      onConfirm: () => {
        const newPins = [...currentMap.pins];
        newPins.splice(index, 1);
        updateCurrentMap({ pins: newPins });
        closeModal();
      }
    });
  };

  const handlePinClick = (targetId) => {
    if (targetId) navigate(`/lore?id=${targetId}`);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000' }}>
      
      <CustomModal isOpen={modal.isOpen} type={modal.type} title={modal.title} message={modal.message} onConfirm={modal.onConfirm} onCancel={closeModal} />

      {/* --- TAB BAR --- */}
      <div style={tabBarStyle}>
        <div style={{ display: 'flex', gap: '2px', overflowX: 'auto', flex: 1 }}>
          {maps.map(map => (
            <div 
              key={map.id}
              onClick={() => setActiveMapId(map.id)}
              onDoubleClick={() => renameTab(map.id)}
              style={{
                ...tabStyle,
                background: activeMapId === map.id ? 'var(--bg-app)' : 'var(--bg-panel)',
                borderBottom: activeMapId === map.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeMapId === map.id ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              {map.name}
              {maps.length > 1 && (
                <span onClick={(e) => deleteTab(map.id, e)} style={closeTabStyle}>×</span>
              )}
            </div>
          ))}
        </div>
        
        <button onClick={createNewTab} style={newTabBtnStyle}>
          + Add a new Map
        </button>
      </div>

      {/* --- TOOLBAR --- */}
      <div style={toolbarStyle}>
        <div>
           {/* If map exists, show name, else show instruction */}
           <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
             {currentMap.imageSrc ? 'Double-click map to add pins.' : 'Upload an image to start.'}
           </div>
        </div>

        <label style={uploadBtnStyle}>
          {currentMap.imageSrc ? 'Replace Image' : 'Upload Image'}
          <input type="file" accept="image/*" onChange={handleMapUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {/* --- MAP CANVAS WRAPPER --- */}
      {/* We use a key based on activeMapId to force a re-render when switching tabs 
          so the zoom/pan state resets cleanly */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
         <MapCanvas 
            key={activeMapId} 
            mapImage={currentMap.imageSrc} 
            pins={currentMap.pins || []} 
            onAddPin={handleAddPin}
            onRemovePin={handleRemovePin}
            onPinClick={handlePinClick}
            allEntities={allEntities}
         />
      </div>
    </div>
  );
};

// --- STYLES ---
const tabBarStyle = { height: '36px', background: 'var(--bg-header)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '5px' };
const tabStyle = { padding: '0 15px', height: '100%', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', borderRight: '1px solid var(--border)', position: 'relative', whiteSpace: 'nowrap' };
const closeTabStyle = { marginLeft: '8px', fontSize: '14px', color: '#666', cursor: 'pointer' };
const newTabBtnStyle = { background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: '0 10px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' };

const toolbarStyle = { 
  padding: '8px 20px', 
  background: 'var(--bg-panel)', 
  borderBottom: '1px solid var(--border)', 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  zIndex: 10 
};

const uploadBtnStyle = { 
  background: 'var(--bg-header)', 
  border: '1px solid var(--border)', 
  padding: '4px 12px', 
  borderRadius: '4px', 
  color: 'var(--text-main)', 
  cursor: 'pointer', 
  fontWeight: 'bold', 
  fontSize: '11px' 
};

export default WorldMapPage;