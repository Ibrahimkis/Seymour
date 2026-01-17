// ...existing code...
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSearchParams } from 'react-router-dom';
import AutoResizeTextarea from '../../components/AutoResizeTextarea';
import LoreLinkedText from '../../components/LoreLinkedText';
import ImageEditorModal from '../../components/ImageEditorModal';
import { useProject } from '../../context/ProjectContext'; 
import CustomModal from '../../components/CustomModal'; 
import { compressImage } from '../../utils/imageCompression';

// --- DatabaseExplorer COMPONENT ---
const DatabaseExplorer = ({ projectData, setProjectData, saveNowSilently, searchParams, setSearchParams }) => {
  // --- Folder context from URL params ---
  const currentFolderId = searchParams.get('folderId') || null;
  const folders = projectData.lore.folders || [];
  const currentFolder = folders.find(f => f.id === currentFolderId) || null;
  // --- Filter folders/items for current folder ---
  const currentFolders = folders.filter(f => f.parentId === currentFolderId);
  const currentItems = (projectData.lore.characters || []).filter(i => (i.folderId || null) === currentFolderId);
  // --- Stats calculation for banner ---
  const items = projectData.lore.characters || [];
    const getTopFolder = (folderId) => {
      if (!folderId) return null;
      const folderById = new Map(folders.map(f => [f.id, f]));
      let current = folderById.get(folderId);
      let safety = 0;
      while (current && current.parentId !== null && safety < 50) {
        current = folderById.get(current.parentId);
        safety += 1;
      }
      return current || null;
    };
    const stats = useMemo(() => {
      const categoryCounts = {};
      items.forEach(item => {
        const top = getTopFolder(item.folderId);
        const name = top?.name || 'Root';
        categoryCounts[name] = (categoryCounts[name] || 0) + 1;
      });
      const byCategory = Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      return {
        total: items.length,
        folders: folders.length,
        byCategory
      };
    }, [items, folders]);
  // All the logic previously at the top level goes here
  // ...existing code...

  // --- Folder Rename Modal State/Handlers ---
  const [renameModal, setRenameModal] = useState({ isOpen: false, name: '', id: null });

  function openRenameModal(folder) {
    setRenameModal({ isOpen: true, name: folder.name, id: folder.id });
  }

  function closeRenameModal() {
    setRenameModal(prev => ({ ...prev, isOpen: false }));
  }

  function handleRenameFolder(newName) {
    setProjectData(prev => {
      const folders = prev.lore.folders.map(f => f.id === renameModal.id ? { ...f, name: newName } : f);
      const next = { ...prev, lore: { ...prev.lore, folders } };
      saveNowSilently?.(next);
      return next;
    });
    setRenameModal(prev => ({ ...prev, isOpen: false }));
  }

  const [modal, setModal] = useState({ isOpen: false, type: 'input', title: '', onConfirm: () => {} });

  // Bulk import
  const importInputRef = useRef(null);

  const inferTopLevelFolder = (folderId) => {
    if (!folderId) return null;
    const folderById = new Map(folders.map(f => [f.id, f]));
    let current = folderById.get(folderId);
    let safety = 0;
    while (current && current.parentId !== null && safety < 50) {
      current = folderById.get(current.parentId);
      safety += 1;
    }
    return current || null;
  };

  const inferTypeFromCategory = () => {
    if (!currentFolderId) return 'Character';
    const top = inferTopLevelFolder(currentFolderId);
    const name = String(top?.name || '').toLowerCase();
    if (top?.id === 'root_char' || name.includes('character')) return 'Character';
    if (top?.id === 'root_loc' || name.includes('location')) return 'Location';
    // "Magic powers" and most non-character lists fit best as a Concept.
    return 'Concept';
  };

  const parseListText = (text) => {
    return String(text || '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  };

  const handleImportListFile = async (file) => {
    if (!file) return;

    try {
      const text = await file.text();
      const names = parseListText(text);

      if (names.length === 0) {
        setModal({
          isOpen: true,
          type: 'confirm',
          title: 'Import List',
          message: 'No items found. Put one name per line.',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        });
        return;
      }

      const existing = new Set(items.map(i => String(i.name || '').trim().toLowerCase()).filter(Boolean));
      const type = inferTypeFromCategory();

      const newEntities = [];
      let skipped = 0;

      names.forEach((rawName, idx) => {
        const key = rawName.toLowerCase();
        if (existing.has(key)) {
          skipped += 1;
          return;
        }
        existing.add(key);
        newEntities.push({
          id: Date.now() + idx,
          name: rawName,
          aliases: [],
          folderId: currentFolderId,
          type,
          imageSrc: null,
          biography: '',
          sections: [],
        });
      });

      if (newEntities.length === 0) {
        setModal({
          isOpen: true,
          type: 'confirm',
          title: 'Import List',
          message: 'All items already exist (no new cards created).',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        });
        return;
      }

      const nextProject = {
        ...projectData,
        lore: {
          ...projectData.lore,
          characters: [...items, ...newEntities],
        },
      };

      setProjectData(nextProject);
      saveNowSilently?.(nextProject);

      setModal({
        isOpen: true,
        type: 'confirm',
        title: 'Import Complete',
        message: `Created ${newEntities.length} lore cards${skipped ? ` (skipped ${skipped} duplicates)` : ''}.`,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
      });
    } catch (err) {
      console.error('Import failed:', err);
      setModal({
        isOpen: true,
        type: 'confirm',
        title: 'Import Error',
        message: 'Failed to read that file. Try a plain .txt file (UTF-8).',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
      });
    }
  };

  const openImportPicker = () => {
    if (importInputRef.current) {
      importInputRef.current.value = '';
      importInputRef.current.click();
    }
  };

  // --- ACTIONS ---
  const openFolder = (folderId) => {
    // Force save before navigation
    window.dispatchEvent(new CustomEvent('force-save-lore'));
    setSearchParams({ folderId });
  };
  const openItem = (itemId) => {
    // Force save before navigation
    window.dispatchEvent(new CustomEvent('force-save-lore'));
    setSearchParams({ id: itemId });
  };
  const goUp = () => {
    if (!currentFolder) return;
    if (currentFolder.parentId === null) setSearchParams({});
    else setSearchParams({ folderId: currentFolder.parentId });
  };

  const createFolder = () => {
    setModal({
      isOpen: true, type: 'input', title: 'New Folder Name',
      onConfirm: (name) => {
        const newFolder = { id: `folder_${Date.now()}`, name: name || 'Untitled Folder', parentId: currentFolderId, isOpen: true };
        setProjectData({ ...projectData, lore: { ...projectData.lore, folders: [...folders, newFolder] } });
        setModal({ ...modal, isOpen: false });
      }
    });
  };

  const createEntity = () => {
    setModal({
      isOpen: true, type: 'input', title: 'New Entity Name',
      onConfirm: (name) => {
        const newEntity = { 
          id: Date.now(), 
          name: name || 'Unnamed Entity', 
          aliases: [], 
          folderId: currentFolderId,
          type: inferTypeFromCategory(), 
          imageSrc: null, 
          biography: '', // <--- NEW DEDICATED FIELD
          sections: [] // We don't need a default section anymore since Bio is separate
        };
        const nextProject = { ...projectData, lore: { ...projectData.lore, characters: [...items, newEntity] } };
        setProjectData(nextProject);
        saveNowSilently?.(nextProject);
        setModal({ ...modal, isOpen: false });
      }
    });
  };

  const deleteItem = (id, type) => {
    const itemName = type === 'folder' 
      ? folders.find(f => f.id === id)?.name 
      : items.find(i => i.id === id)?.name;
    
    setModal({
      isOpen: true,
      type: 'confirm',
      title: `Delete ${type === 'folder' ? 'Folder' : 'Entity'}?`,
      message: `Are you sure you want to delete "${itemName}"?${type === 'folder' ? ' Items inside will be moved to Unsorted.' : ''}`,
      onConfirm: () => {
        if(type === 'folder') {
          const newFolders = folders.filter(f => f.id !== id);
          const newItems = items.map(i => i.folderId === id ? { ...i, folderId: 'root_misc' } : i);
          setProjectData({ ...projectData, lore: { ...projectData.lore, folders: newFolders, characters: newItems } });
        } else {
          const newItems = items.filter(i => i.id !== id);
          setProjectData({ ...projectData, lore: { ...projectData.lore, characters: newItems } });
        }
        setModal({ ...modal, isOpen: false });
      }
    });
  };

  // --- IMPROVED SNIPPET FINDER ---
  const getBioSnippet = (item) => {
    // 1. Priority: The new dedicated field
    if (item.biography && item.biography.trim().length > 0) {
      return item.biography;
    }

    // 2. Legacy Fallback: Look inside sections
    if (!item.sections || item.sections.length === 0) return '';
    for (let s of item.sections) {
      for (let b of s.blocks) {
        if (['summary', 'description', 'biography'].includes(b.label.toLowerCase()) && b.content) {
          return b.content;
        }
      }
    }
    return '';
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <CustomModal isOpen={modal.isOpen} type={modal.type} title={modal.title} onConfirm={modal.onConfirm} onCancel={() => setModal({...modal, isOpen: false})} />
      {/* Folder Rename Modal */}
      <CustomModal
        isOpen={renameModal.isOpen}
        type="input"
        title="Rename Folder"
        defaultValue={renameModal.name}
        onConfirm={handleRenameFolder}
        onCancel={closeRenameModal}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".txt,text/plain"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportListFile(file);
        }}
      />
      
      {/* STATISTICS BANNER */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        padding: '1.25rem',
        background: 'var(--bg-panel)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        marginBottom: '30px'
      }}>
        <div style={{
          flex: 1,
          textAlign: 'center',
          padding: '0.75rem',
          background: 'var(--bg-secondary)',
          borderRadius: '6px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--accent)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Entries
          </div>
        </div>
        <div style={{
          flex: 1,
          textAlign: 'center',
          padding: '0.75rem',
          background: 'var(--bg-secondary)',
          borderRadius: '6px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--accent)' }}>
            {stats.folders}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Folders
          </div>
        </div>
        {stats.byCategory.map(({ name, count }) => (
          <div key={name} style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.75rem',
            background: 'var(--bg-secondary)',
            borderRadius: '6px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
              {count}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {name}
            </div>
          </div>
        ))}
      </div>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', paddingBottom: '15px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={goUp} disabled={!currentFolderId} style={{ ...navBtnStyle, opacity: currentFolderId ? 1 : 0.3 }}>⬆ Up</button>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}> / {currentFolder ? currentFolder.name : 'Home'}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={openImportPicker} style={actionBtnStyle}>⬆ Upload List</button>
            <button onClick={createFolder} style={actionBtnStyle}>+ New Folder</button>
            <button onClick={createEntity} style={{...actionBtnStyle, background: 'var(--accent)', color: 'white', border: 'none'}}>+ New Entity</button>
        </div>
      </div>

      {/* SCROLLABLE GRID */}
      <div style={{maxHeight: '60vh', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-panel)', marginBottom: '20px'}}>
        <div style={gridContainerStyle}>
          {currentFolders.map(folder => (
            <div key={folder.id} onClick={() => openFolder(folder.id)} style={cardStyle} className="explorer-card">
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
              <div style={cardNameStyle}>{folder.name}</div>
              <div style={cardMetaStyle}>Folder</div>
              <div style={{position: 'absolute', top: 5, right: 35, cursor: 'pointer', color: '#666'}} onClick={(e) => { e.stopPropagation(); openRenameModal(folder); }} title="Rename">✎</div>
              <div style={{position: 'absolute', top: 5, right: 5, cursor: 'pointer', color: '#666'}} onClick={(e) => { e.stopPropagation(); deleteItem(folder.id, 'folder'); }}>✕</div>
            </div>
          ))}
          {currentItems.map(item => (
            <div key={item.id} onClick={() => openItem(item.id)} style={{...cardStyle, height: '240px'}} className="explorer-card">
              <div style={thumbnailContainerStyle}>
                {item.imageSrc ? (<div style={{ width: '100%', height: '100%', ...item.imageStyles, backgroundImage: `url(${item.imageSrc})`, backgroundRepeat: 'no-repeat', backgroundSize: 'cover' }} />) : (<span style={{ fontSize: '30px' }}>📍</span>)}
              </div>
              <div style={cardNameStyle}>{item.name}</div>
              <div style={cardMetaStyle}>{item.type || 'Entity'}</div>
              {/* BIO SNIPPET */}
              <div style={snippetStyle}>
                {getBioSnippet(item) || <span style={{fontStyle:'italic', opacity:0.5}}>No description...</span>}
              </div>
              <div style={{position: 'absolute', top: 5, right: 5, cursor: 'pointer', color: '#666'}} onClick={(e) => { e.stopPropagation(); deleteItem(item.id, 'item'); }}>✕</div>
            </div>
          ))}
          {currentFolders.length === 0 && currentItems.length === 0 && (<div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>This folder is empty.</div>)}
        </div>
      </div>
    </div>
  );
};


// ==========================================
// PART 2: THE CHARACTER SHEET
// ==========================================
const CharacterSheet = ({ character, projectData, setProjectData, saveNowSilently, charIndex }) => {
    // Drag-and-drop active block state
    const [activeBlock, setActiveBlock] = useState(null);
  const [tempImageSrc, setTempImageSrc] = useState(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} });
  const [linkModal, setLinkModal] = useState({ isOpen: false, linkText: '', targetId: null });
  const closeModal = () => setModal({ ...modal, isOpen: false });
  const closeLinkModal = () => setLinkModal({ isOpen: false, linkText: '', targetId: null });

  // Memoize manualLinks to prevent unnecessary re-renders
  const manualLinks = useMemo(() => character.manualLinks || [], [character.manualLinks]);

  const pendingSaveTimerRef = useRef(null);
  useEffect(() => {
    return () => {
      if (pendingSaveTimerRef.current) {
        clearTimeout(pendingSaveTimerRef.current);
      }
    };
  }, []);

  const updateCharacter = useCallback((updates) => {
    const newLore = { ...projectData.lore };
    const updatedChar = { ...character, ...updates };
    newLore.characters[charIndex] = updatedChar;
    const nextProject = { ...projectData, lore: newLore };
    setProjectData(nextProject);

    if (pendingSaveTimerRef.current) {
      clearTimeout(pendingSaveTimerRef.current);
    }
    pendingSaveTimerRef.current = setTimeout(() => {
      saveNowSilently?.(nextProject);
    }, 350);
  }, [projectData, character, charIndex, setProjectData, saveNowSilently]);

  // Listen for force save events (when user clicks away from lore card)
  useEffect(() => {
    const handleForceSave = () => {
      // Force a ProjectContext save by triggering a data change
      const newLore = { ...projectData.lore };
      setProjectData({ ...projectData, lore: newLore });
      saveNowSilently?.({ ...projectData, lore: newLore });
    };

    window.addEventListener('force-save-lore', handleForceSave);
    window.addEventListener('force-save-all', handleForceSave);
    return () => {
      window.removeEventListener('force-save-lore', handleForceSave);
      window.removeEventListener('force-save-all', handleForceSave);
    };
  }, [projectData, setProjectData, saveNowSilently]);

  // ALIAS HANDLERS
  const handleAddAlias = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim();
      if (val && !character.aliases?.includes(val)) {
        updateCharacter({ aliases: [...(character.aliases || []), val] });
        e.target.value = '';
      }
    }
  };
  const handleRemoveAlias = (aliasToRemove) => {
    updateCharacter({ aliases: (character.aliases || []).filter(a => a !== aliasToRemove) });
  };

  // MANUAL LINK HANDLERS
  const handleCreateLink = () => {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) {
      setModal({
        isOpen: true,
        type: 'confirm',
        title: 'No Text Selected',
        message: 'Please select some text first, then click "Link Lore".',
        onConfirm: closeModal
      });
      return;
    }
    setLinkModal({ isOpen: true, linkText: selectedText, targetId: null });
  };

  const handleSaveLink = () => {
    if (!linkModal.targetId) return;
    const manualLinks = character.manualLinks || [];
    const newLink = {
      id: Date.now(),
      text: linkModal.linkText,
      targetId: linkModal.targetId
    };
    updateCharacter({ manualLinks: [...manualLinks, newLink] });
    closeLinkModal();
  };

  const handleRemoveLink = (linkId) => {
    const manualLinks = (character.manualLinks || []).filter(l => l.id !== linkId);
    updateCharacter({ manualLinks });
  };

  const handleRemoveAllLinks = () => {
    const linkCount = (character.manualLinks || []).length;
    
    if (linkCount === 0) {
      setModal({
        isOpen: true,
        type: 'confirm',
        title: 'No Links',
        message: 'There are no manual links to remove.',
        onConfirm: closeModal
      });
      return;
    }
    
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Remove All Links?',
      message: `Remove all ${linkCount} manual link(s)? This will clear your custom link mappings.`,
      onConfirm: () => {
        updateCharacter({ manualLinks: [] });
        closeModal();
      }
    });
  };

  // HANDLERS
  const getFolderOptions = () => {
    const folders = projectData.lore.folders || [];
    const buildList = (parentId, depth) => {
      const children = folders.filter(f => f.parentId === parentId);
      let list = [];
      children.forEach(folder => {
        list.push({ id: folder.id, name: folder.name, depth });
        list.push(...buildList(folder.id, depth + 1));
      });
      return list;
    };
    return buildList(null, 0);
  };
  const folderOptions = getFolderOptions();
  
  const handleFileSelect = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Check file size
  const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
  console.log(`📁 Original file size: ${fileSizeMB}MB`);
  
  try {
    // Show loading state (optional)
    // You could add a loading spinner here
    
    // Compress the image
    const compressedImage = await compressImage(file, 600, 600, 0.75);
    
    // Use compressed image
    setTempImageSrc(compressedImage);
    setIsEditingImage(true);
    
  } catch (err) {
    console.error('Image compression failed:', err);
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Upload Error',
      message: 'Failed to process image. Please try a smaller file.',
      onConfirm: closeModal
    });
  }
  
  e.target.value = ''; // Reset input
};
  const handleSaveImage = (styles) => { updateCharacter({ imageStyles: styles, imageSrc: tempImageSrc }); setIsEditingImage(false); };

  // BLOCKS
  const addSection = () => updateCharacter({ sections: [...(character.sections||[]), { id: Date.now(), title: 'New Section', blocks: [] }] });
  const updateSectionTitle = (sId, val) => updateCharacter({ sections: character.sections.map(s => s.id === sId ? { ...s, title: val } : s) });
  const deleteSection = (sId) => { 
    setModal({
      isOpen: true, type: 'confirm', title: 'Delete Section', message: 'Remove this entire section?',
      onConfirm: () => { updateCharacter({ sections: character.sections.filter(s => s.id !== sId) }); closeModal(); }
    });
  };
  const addBlock = (sId) => updateCharacter({ sections: character.sections.map(s => s.id === sId ? { ...s, blocks: [...s.blocks, { id: Date.now(), label: 'New Field', content: '' }] } : s) });
  const updateBlock = (sId, bId, f, v) => updateCharacter({ sections: character.sections.map(s => s.id === sId ? { ...s, blocks: s.blocks.map(b => b.id === bId ? { ...b, [f]: v } : b) } : s) });
  const deleteBlock = (sId, bId) => updateCharacter({ sections: character.sections.map(s => s.id === sId ? { ...s, blocks: s.blocks.filter(b => b.id !== bId) } : s) });

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px', height: 'calc(100vh - 60px)', overflowY: 'auto', boxSizing: 'border-box' }}>
      <CustomModal isOpen={modal.isOpen} type={modal.type} title={modal.title} message={modal.message} onConfirm={modal.onConfirm} onCancel={closeModal} />
      {isEditingImage && <ImageEditorModal imageSrc={tempImageSrc} onSave={handleSaveImage} onCancel={() => setIsEditingImage(false)} />}
      
      {/* LINK MODAL */}
      {linkModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>Link "{linkModal.linkText}" to:</h3>
            <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: '15px' }}>
              {projectData.lore.characters
                .filter(c => c.id !== character.id)
                .map(entity => (
                  <div
                    key={entity.id}
                    onClick={() => setLinkModal({ ...linkModal, targetId: entity.id })}
                    style={{
                      padding: '10px',
                      margin: '5px 0',
                      background: linkModal.targetId === entity.id ? 'var(--accent)' : 'var(--bg-header)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: linkModal.targetId === entity.id ? 'white' : 'var(--text-main)'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{entity.name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>{entity.type || 'Entity'}</div>
                  </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeLinkModal}
                style={{
                  background: 'var(--bg-header)',
                  border: '1px solid var(--border)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--text-main)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLink}
                disabled={!linkModal.targetId}
                style={{
                  background: linkModal.targetId ? 'var(--accent)' : '#555',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: linkModal.targetId ? 'pointer' : 'not-allowed',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                Create Link
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
            <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>FOLDER:</span>
            <select value={character.folderId || ''} onChange={(e) => updateCharacter({ folderId: e.target.value })} style={folderSelectStyle}>
              <option value="">Root</option>
              {folderOptions.map(opt => <option key={opt.id} value={opt.id}>{'\u00A0'.repeat(opt.depth * 3) + (opt.depth > 0 ? '↳ ' : '') + opt.name}</option>)}
            </select>
          </div>
          
          <input type="text" value={character.name || ""} onChange={(e) => updateCharacter({ name: e.target.value })} style={{ background: 'transparent', border: 'none', fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)', width: '100%', outline: 'none' }} placeholder="Entity Name" />
          
          {/* TYPE SELECTOR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TYPE:</span>
            <select 
              value={character.type || 'Character'} 
              onChange={(e) => updateCharacter({ type: e.target.value })} 
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-main)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="Character">Character</option>
              <option value="Location">Location</option>
              <option value="Item">Item</option>
              <option value="Faction">Faction</option>
              <option value="Event">Event</option>
              <option value="Concept">Concept</option>
              <option value="Creature">Creature</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* LINK LORE BUTTON */}
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={handleCreateLink}
              style={{
                background: 'var(--accent)',
                border: 'none',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              🔗 Link Lore
            </button>
            <button 
              onClick={handleRemoveAllLinks}
              style={{
                background: 'var(--bg-header)',
                border: '1px solid var(--border)',
                color: 'var(--text-main)',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              🔓 Unlink All
            </button>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Select text, then click Link to connect to another entity
            </span>
          </div>

          {/* ALIASES */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '5px' }}>Aliases/Tags:</span>
            {(character.aliases || []).map((alias, i) => (
              <div key={i} style={tagStyle}>
                {alias}
                <button onClick={() => handleRemoveAlias(alias)} style={removeTagBtn}>×</button>
              </div>
            ))}
            <input type="text" placeholder="+ Add Tag (Enter)" onKeyDown={handleAddAlias} style={aliasInputStyle} />
          </div>

          {/* MANUAL LINKS DISPLAY */}
          {character.manualLinks && character.manualLinks.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '5px' }}>MANUAL LINKS:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {character.manualLinks.map(link => {
                  const target = projectData.lore.characters.find(c => c.id === link.targetId);
                  return (
                    <div key={link.id} style={{
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--accent)',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span>"{link.text}" → {target?.name || 'Unknown'}</span>
                      <button
                        onClick={() => handleRemoveLink(link.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          padding: 0
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- NEW DEDICATED BIOGRAPHY BOX --- */}
          <div style={{ marginTop: '15px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '5px', letterSpacing: '1px' }}>BIOGRAPHY / DESCRIPTION</div>
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '4px', padding: '10px' }}>
              <LoreLinkedText 
                value={character.biography || ""} 
                onChange={(val) => updateCharacter({ biography: val })} 
                placeholder="Write a brief biography or description..."
                manualLinks={manualLinks}
              />
            </div>
          </div>

        </div>
        <div style={portraitContainerStyle}>
          <label style={{ cursor: 'pointer', display: 'block', height: '100%', width: '100%' }}>
            {character.imageSrc ? ( <div style={{ width: '100%', height: '100%', ...character.imageStyles, backgroundImage: `url(${character.imageSrc})`, backgroundRepeat: 'no-repeat', backgroundSize: 'cover' }} /> ) : ( <div style={placeholderStyle}><span style={{ fontSize: '24px' }}>📷</span></div> )}
            <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* SECTIONS (dnd-kit) */}
      <DndContext
        sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 2 } }))}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => {
          // Find the block being dragged
          let found = null;
          (character.sections || []).forEach(section => {
            const block = (section.blocks || []).find(b => String(b.id) === String(active.id));
            if (block) found = { ...block };
          });
          setActiveBlock(found);
        }}
        onDragEnd={({ active, over }) => {
          setActiveBlock(null);
          if (!over || active.id === over.id) return;
          // Find the source section and block
          let fromSectionIdx = -1;
          let fromBlockIdx = -1;
          character.sections.forEach((section, sIdx) => {
            const idx = (section.blocks || []).findIndex(b => String(b.id) === String(active.id));
            if (idx !== -1) {
              fromSectionIdx = sIdx;
              fromBlockIdx = idx;
            }
          });
          if (fromSectionIdx === -1 || fromBlockIdx === -1) return;
          // Find the destination section and block
          let toSectionIdx = -1;
          let toBlockIdx = -1;
          character.sections.forEach((section, sIdx) => {
            const idx = (section.blocks || []).findIndex(b => String(b.id) === String(over.id));
            if (idx !== -1) {
              toSectionIdx = sIdx;
              toBlockIdx = idx;
            }
          });
          // If dropped on empty section, allow drop at end
          if (toSectionIdx === -1) {
            // Check if over.id is a section id (for empty section drop zones)
            toSectionIdx = character.sections.findIndex(s => String(s.id) === String(over.id));
            toBlockIdx = 0;
            if (toSectionIdx === -1) return;
          }
          // If same section, just reorder
          if (fromSectionIdx === toSectionIdx) {
            const section = character.sections[fromSectionIdx];
            const newBlocks = arrayMove(section.blocks, fromBlockIdx, toBlockIdx);
            const newSections = character.sections.map((s, idx) => idx === fromSectionIdx ? { ...s, blocks: newBlocks } : s);
            updateCharacter({ sections: newSections });
            return;
          }
          // Move block between sections
          const fromSection = character.sections[fromSectionIdx];
          const toSection = character.sections[toSectionIdx];
          const movingBlock = fromSection.blocks[fromBlockIdx];
          // Remove from old section
          const newFromBlocks = fromSection.blocks.filter((_, idx) => idx !== fromBlockIdx);
          // Insert into new section at correct position
          const newToBlocks = [...toSection.blocks];
          if (typeof toBlockIdx === 'number') {
            newToBlocks.splice(toBlockIdx, 0, movingBlock);
          } else {
            newToBlocks.push(movingBlock);
          }
          const newSections = character.sections.map((s, idx) => {
            if (idx === fromSectionIdx) return { ...s, blocks: newFromBlocks };
            if (idx === toSectionIdx) return { ...s, blocks: newToBlocks };
            return s;
          });
          updateCharacter({ sections: newSections });
        }}
      >
        {(character.sections || []).map((section) => (
          <div key={section.id} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--border)' }}>
              <input type="text" value={section.title} onChange={(e) => updateSectionTitle(section.id, e.target.value)} style={sectionTitleStyle} />
              <button onClick={() => deleteSection(section.id)} style={deleteBtnStyle}>Delete Section</button>
            </div>
            <SortableContext items={((section.blocks || []).length > 0 ? (section.blocks || []).map(b => String(b.id)) : [String(section.id)])} strategy={verticalListSortingStrategy}>
              <div style={gridStyle}>
                {(section.blocks || []).map((block, idx) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    sectionId={section.id}
                    updateBlock={updateBlock}
                    deleteBlock={deleteBlock}
                    manualLinks={manualLinks}
                  />
                ))}
                {(!section.blocks || section.blocks.length === 0) && (
                  <div
                    style={{ minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed var(--border)', borderRadius: '4px', marginBottom: '10px' }}
                    data-id={section.id}
                  >
                    Drop a field here
                  </div>
                )}
                <button onClick={() => addBlock(section.id)} style={addBlockBtnStyle}>+ Add Field</button>
              </div>
            </SortableContext>
          </div>
        ))}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
          {activeBlock ? (
            <div style={{
              ...blockStyle,
              background: 'var(--bg-panel)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              opacity: 0.95,
              pointerEvents: 'none',
              transform: 'scale(1.04)',
              transition: 'box-shadow 0.2s, transform 0.2s',
              zIndex: 9999,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', color: '#aaa', marginRight: '8px' }}>≡</span>
                <input type="text" value={activeBlock.label} readOnly style={labelInputStyle} />
                <button style={xBtnStyle} disabled>✕</button>
              </div>
              <div style={contentBoxStyle}><LoreLinkedText value={activeBlock.content} onChange={() => {}} manualLinks={[]} /></div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <button onClick={addSection} style={addSectionBtnStyle}>+ Create New Section</button>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const LoreCard = () => {
  const { projectData, setProjectData, saveNowSilently } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();

  if (!projectData || !projectData.lore) return <div style={{ padding: '40px', color: '#888' }}>Loading...</div>;

  const urlId = searchParams.get('id');

  if (urlId) {
    const charIndex = projectData.lore.characters.findIndex(c => c.id.toString() === urlId);
    if (charIndex === -1) return <div style={{padding: 40}}>Entity not found. <button onClick={() => setSearchParams({})}>Go Back</button></div>;
    return <CharacterSheet character={projectData.lore.characters[charIndex]} projectData={projectData} setProjectData={setProjectData} saveNowSilently={saveNowSilently} charIndex={charIndex} />;
  } else {
    return <DatabaseExplorer projectData={projectData} setProjectData={setProjectData} saveNowSilently={saveNowSilently} searchParams={searchParams} setSearchParams={setSearchParams} />;
  }
};

// --- STYLES ---
const navBtnStyle = { background: 'var(--bg-header)', border: '1px solid var(--border)', padding: '5px 15px', borderRadius: '4px', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' };
const actionBtnStyle = { background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' };
const gridContainerStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }; // Wider cards
const cardStyle = { background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', justifyContent: 'flex-start', position: 'relative', transition: '0.2s', overflow: 'hidden' };
const thumbnailContainerStyle = { width: '60px', height: '60px', borderRadius: '50%', background: '#000', overflow: 'hidden', marginBottom: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', flexShrink: 0 };
const cardNameStyle = { fontWeight: 'bold', fontSize: '13px', textAlign: 'center', color: 'var(--text-main)', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const cardMetaStyle = { fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' };

const snippetStyle = { 
  fontSize: '11px', color: '#888', textAlign: 'center', width: '100%', 
  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, // Show 4 lines
  WebkitBoxOrient: 'vertical', lineHeight: '1.4', padding: '0 5px',
  marginTop: '5px'
};

const folderSelectStyle = { background: 'var(--bg-header)', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', outline: 'none', minWidth: '150px' };
const portraitContainerStyle = { width: '150px', height: '150px', borderRadius: '8px', border: '2px dashed var(--border)', background: 'var(--bg-panel)', overflow: 'hidden', marginLeft: '20px', flexShrink: 0 };
const placeholderStyle = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' };
const sectionTitleStyle = { background: 'transparent', border: 'none', fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)', padding: '5px 0', width: '100%', outline: 'none', textTransform: 'uppercase', letterSpacing: '1px' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', alignItems: 'start' };
const blockStyle = { background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '4px', padding: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' };
const labelInputStyle = { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', width: '80%', outline: 'none' };
const contentBoxStyle = { marginTop: '5px', color: 'var(--text-main)', fontSize: '14px', lineHeight: '1.5' };
const xBtnStyle = { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px' };
const deleteBtnStyle = { background: 'none', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' };
const addBlockBtnStyle = { background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-muted)', borderRadius: '4px', cursor: 'pointer', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' };
const addSectionBtnStyle = { display: 'block', width: '100%', padding: '15px', marginTop: '30px', background: 'var(--bg-header)', border: '1px dashed var(--border)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' };

const tagStyle = { background: 'var(--bg-app)', border: '1px solid var(--accent)', color: 'var(--text-main)', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' };
const removeTagBtn = { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', padding: 0 };
const aliasInputStyle = { background: 'transparent', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '11px', padding: '2px 8px', width: '120px', outline: 'none' };

const explorerStyle = `.explorer-card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-color: var(--accent) !important; }`;
const styleTag = document.createElement("style");
styleTag.innerHTML = explorerStyle;
document.head.appendChild(styleTag);


// ...existing code...
// --- SortableBlock COMPONENT (for dnd-kit sortable blocks) ---
function SortableBlock({ block, sectionId, updateBlock, deleteBlock, manualLinks }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(block.id) });
  const style = {
    ...blockStyle,
    transform: CSS.Transform.toString(transform),
    transition: 'box-shadow 0.2s, transform 0.2s',
    boxShadow: isDragging ? '0 8px 32px rgba(0,0,0,0.25)' : blockStyle.boxShadow,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
        <span
          {...listeners}
          style={{
            background: 'none',
            border: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
            fontSize: '16px',
            marginRight: '8px',
            color: '#aaa',
            padding: 0,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            outline: 'none',
          }}
          title="Drag to move"
        >
          <span style={{ fontSize: '18px' }}>≡</span>
        </span>
        <input type="text" value={block.label} onChange={(e) => updateBlock(sectionId, block.id, 'label', e.target.value)} style={labelInputStyle} />
        <button onClick={() => deleteBlock(sectionId, block.id)} style={xBtnStyle}>✕</button>
      </div>
      <div style={contentBoxStyle}><LoreLinkedText value={block.content} onChange={(val) => updateBlock(sectionId, block.id, 'content', val)} manualLinks={manualLinks} /></div>
    </div>
  );
}

export default LoreCard;