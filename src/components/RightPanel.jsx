import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import CustomModal from './CustomModal';
import Wordsmith from '../features/tools/Wordsmith'; 

// --- RECURSIVE FOLDER COMPONENT ---
const FolderNode = ({ folder, allFolders, allItems, level, onToggle, onCreateFolder, onCreateItem, onNavigate, onDeleteFolder, onMoveItem, onDeleteItem, onReorderFolders }) => {
  const childFolders = allFolders.filter(f => f.parentId === folder.id);
  const childItems = allItems.filter(i => i.folderId === folder.id);
  const isOpen = folder.isOpen;
  const paddingLeft = `${level * 15 + 10}px`;

  // --- DRAG HANDLERS (Unchanged) ---
  const handleDragStart = (e) => { e.stopPropagation(); e.dataTransfer.setData("dragType", "folder"); e.dataTransfer.setData("folderId", folder.id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderTop = "2px solid var(--accent)"; };
  const handleDragLeave = (e) => { e.preventDefault(); e.currentTarget.style.borderTop = "1px solid transparent"; };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderTop = "1px solid transparent"; 
    const dragType = e.dataTransfer.getData("dragType");
    if (dragType === "folder") {
      const draggedFolderId = e.dataTransfer.getData("folderId");
      if (draggedFolderId !== folder.id) onReorderFolders(draggedFolderId, folder.id);
    } else {
      const itemId = e.dataTransfer.getData("itemId");
      if (itemId) onMoveItem(itemId, folder.id);
    }
  };
  const handleItemDragStart = (e, itemId) => { e.stopPropagation(); e.dataTransfer.setData("dragType", "item"); e.dataTransfer.setData("itemId", itemId); };

  return (
    <div style={{ userSelect: 'none' }}>
      
      {/* FOLDER ROW */}
      <div 
        className="omnibus-row" 
        style={{ ...rowStyle, paddingLeft }} // rowStyle now has flex!
        draggable="true" 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* LEFT: ICON & NAME */}
        <div 
          onClick={() => onToggle(folder.id)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1, cursor: 'pointer', overflow: 'hidden', minWidth: 0 }}
        >
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{isOpen ? '▼' : '▶'}</span>
          <span style={{ fontWeight: 'bold', color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📁 {folder.name}</span>
        </div>

        {/* RIGHT: ACTION BUTTONS (Visible on Hover) */}
        <div className="folder-actions" style={{ display: 'flex', gap: '2px', marginLeft: '5px' }}>
             <button onClick={(e) => { e.stopPropagation(); onCreateFolder(folder.id); }} className="icon-btn" title="New Subfolder">+📂</button>
             <button onClick={(e) => { e.stopPropagation(); onCreateItem(folder.id); }} className="icon-btn" title="New Item">+📄</button>
             <button onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }} className="icon-btn delete-btn" title="Delete">×</button>
        </div>
      </div>

      {/* CHILDREN */}
      {isOpen && (
        <div>
          {childFolders.map(subFolder => (
            <FolderNode 
              key={subFolder.id} folder={subFolder} allFolders={allFolders} allItems={allItems} 
              level={level + 1} onToggle={onToggle} onCreateFolder={onCreateFolder} onCreateItem={onCreateItem} 
              onNavigate={onNavigate} onDeleteFolder={onDeleteFolder} onMoveItem={onMoveItem} 
              onDeleteItem={onDeleteItem} onReorderFolders={onReorderFolders} 
            />
          ))}

          {childItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => onNavigate(item.id)}
              className="omnibus-item"
              draggable="true"
              onDragStart={(e) => handleItemDragStart(e, item.id)}
              style={{ ...rowStyle, paddingLeft: `${(level + 1) * 15 + 15}px`, cursor: 'grab' }}
            >
              <span style={{ flex: 1, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
              <button onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }} className="icon-btn delete-item-btn" title="Delete Entity">×</button>
            </div>
          ))}
          {childFolders.length === 0 && childItems.length === 0 && (
            <div style={{ paddingLeft: `${(level + 1) * 15 + 15}px`, fontSize: '11px', color: '#555', fontStyle: 'italic', paddingTop: '5px', paddingBottom: '5px' }}>
              (Empty)
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// --- MAIN PANEL ---
const RightPanel = () => {
  const { projectData, setProjectData } = useProject();
  const navigate = useNavigate();
  const [modal, setModal] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} });
  const [activeTab, setActiveTab] = useState('lore'); 
  const [searchTerm, setSearchTerm] = useState('');

  // Init
  useEffect(() => {
    if (!projectData.lore) return;
    if (!projectData.lore.folders) {
      const seeds = [
        { id: 'root_char', name: 'Characters', parentId: null, isOpen: true },
        { id: 'root_loc', name: 'Locations', parentId: null, isOpen: true },
        { id: 'root_misc', name: 'Unsorted', parentId: null, isOpen: true },
      ];
      setProjectData({ ...projectData, lore: { ...projectData.lore, folders: seeds } });
    }
  }, [projectData]);

  // Actions
  const updateLore = (updates) => { setProjectData({ ...projectData, lore: { ...projectData.lore, ...updates } }); };
  const closeModal = () => setModal({ ...modal, isOpen: false });

  const toggleFolder = (folderId) => {
    const newFolders = projectData.lore.folders.map(f => f.id === folderId ? { ...f, isOpen: !f.isOpen } : f);
    updateLore({ folders: newFolders });
  };

  const createFolder = (parentId) => {
    setModal({
      isOpen: true, type: 'input', title: parentId ? 'New Sub-Folder' : 'New Root Folder', message: 'Name:', defaultValue: 'New Folder',
      onConfirm: (name) => {
        if (!name) return;
        const newFolder = { id: Date.now().toString(), name, parentId, isOpen: true };
        updateLore({ folders: [...(projectData.lore.folders || []), newFolder] });
        closeModal();
      }
    });
  };

  const createItem = (folderId) => {
    const newId = Date.now();
    const newChar = { id: newId, folderId, name: "New Entity", type: 'character', imageSrc: null, sections: [{ id: 1, title: "Identity", blocks: [] }] };
    updateLore({ characters: [...(projectData.lore.characters || []), newChar] });
    navigate(`/lore?id=${newId}`);
  };

  const deleteFolder = (folderId) => {
    setModal({
      isOpen: true, type: 'confirm', title: 'Delete Folder?', message: 'Items inside will be moved to Unsorted.',
      onConfirm: () => {
        const newChars = projectData.lore.characters.map(c => c.folderId === folderId ? { ...c, folderId: 'root_misc' } : c);
        const newFolders = projectData.lore.folders.filter(f => f.id !== folderId);
        updateLore({ folders: newFolders, characters: newChars });
        closeModal();
      }
    });
  };

  const handleMoveItem = (itemId, targetFolderId) => {
    const item = projectData.lore.characters.find(c => c.id == itemId); 
    const targetFolder = projectData.lore.folders.find(f => f.id === targetFolderId);
    if (!item || !targetFolder || item.folderId === targetFolderId) return;

    setModal({
      isOpen: true, type: 'confirm', title: 'Move Item', message: `Move "${item.name}" to folder "${targetFolder.name}"?`,
      onConfirm: () => {
        const newChars = projectData.lore.characters.map(c => c.id == itemId ? { ...c, folderId: targetFolderId } : c);
        updateLore({ characters: newChars });
        closeModal();
      }
    });
  };

  const handleDeleteItem = (itemId) => {
    setModal({
      isOpen: true, type: 'confirm', title: 'Delete Entity?', message: 'Permanently delete this item?',
      onConfirm: () => {
        const newChars = projectData.lore.characters.filter(c => c.id !== itemId);
        updateLore({ characters: newChars });
        if (window.location.search.includes(itemId)) navigate('/lore');
        closeModal();
      }
    });
  };

  const handleReorderFolders = (draggedId, targetId) => {
    if (draggedId === targetId) return;
    const folders = [...projectData.lore.folders];
    const dragIndex = folders.findIndex(f => f.id === draggedId);
    const targetIndex = folders.findIndex(f => f.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;
    const [draggedItem] = folders.splice(dragIndex, 1);
    folders.splice(targetIndex, 0, draggedItem);
    updateLore({ folders });
  };

  const handleNoteChange = (e) => {
    setProjectData({ ...projectData, globalNotes: e.target.value });
  };

  const folders = projectData.lore?.folders || [];
  const items = projectData.lore?.characters || [];
  const rootFolders = folders.filter(f => f.parentId === null);

  // --- FILTER ---
  const getFilteredItems = () => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return items.filter(item => {
      const nameMatch = item.name?.toLowerCase().includes(term);
      const aliasMatch = Array.isArray(item.aliases) && item.aliases.some(a => a.toLowerCase().includes(term));
      return nameMatch || aliasMatch;
    });
  };
  const searchResults = getFilteredItems();

  return (
    <aside style={panelStyle}>
      <CustomModal isOpen={modal.isOpen} type={modal.type} title={modal.title} message={modal.message} defaultValue={modal.defaultValue} onConfirm={modal.onConfirm} onCancel={closeModal} />
      
      <div style={tabContainerStyle}>
        <button onClick={() => setActiveTab('lore')} style={activeTab === 'lore' ? activeTabStyle : tabStyle}>📂 Tree</button>
        <button onClick={() => setActiveTab('notes')} style={activeTab === 'notes' ? activeTabStyle : tabStyle}>📝 Notes</button>
        <button onClick={() => setActiveTab('dict')} style={activeTab === 'dict' ? activeTabStyle : tabStyle}>📖 Dict</button>
      </div>

      <div style={contentAreaStyle}>
        
        {/* --- TAB 1: OMNIBUS --- */}
        {activeTab === 'lore' && (
          <>
            <div style={headerStyle}>
              <span>OMNIBUS TREE</span>
              <button onClick={() => createFolder(null)} className="icon-btn" style={{ fontSize: '14px', fontWeight: 'bold' }}>+📂</button>
            </div>
            
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <input type="text" placeholder="🔍 Filter Name/Tag..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={searchInputStyle} />
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
              {searchTerm ? (
                <div style={{ padding: '5px' }}>
                  {searchResults.length === 0 && <div style={{ padding: '10px', color: '#666', fontSize: '12px', fontStyle: 'italic' }}>No matches found.</div>}
                  {searchResults.map(item => (
                    <div key={item.id} onClick={() => navigate(`/lore?id=${item.id}`)} className="omnibus-item" style={{ ...rowStyle, cursor: 'pointer', borderRadius: '4px', marginBottom: '2px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', marginRight: '6px' }}>👤</span>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-main)' }}>{item.name}</div>
                        {item.aliases && item.aliases.length > 0 && <div style={{ fontSize: '10px', color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.aliases.join(', ')}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                rootFolders.map(folder => ( <FolderNode key={folder.id} folder={folder} allFolders={folders} allItems={items} level={0} onToggle={toggleFolder} onCreateFolder={createFolder} onCreateItem={createItem} onNavigate={(id) => navigate(`/lore?id=${id}`)} onDeleteFolder={deleteFolder} onMoveItem={handleMoveItem} onDeleteItem={handleDeleteItem} onReorderFolders={handleReorderFolders} /> ))
              )}
            </div>
          </>
        )}

        {/* --- TAB 2: NOTES --- */}
        {activeTab === 'notes' && (
          <textarea value={projectData.globalNotes || ""} onChange={handleNoteChange} placeholder="Global scratchpad..." style={textAreaStyle} className="custom-scrollbar" />
        )}

        {/* --- TAB 3: DICT --- */}
        {activeTab === 'dict' && (
          <div style={{ padding: '15px', height: '100%' }} className="custom-scrollbar">
            <Wordsmith />
          </div>
        )}

      </div>

      <style>{`
        /* UPDATED ROW STYLE FOR FLEX */
        .omnibus-row { display: flex !important; align-items: center; justify-content: space-between; }
        
        .icon-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 10px; padding: 2px 4px; opacity: 0; transition: opacity 0.2s; }
        .folder-actions .icon-btn { opacity: 0; }
        
        /* SHOW BUTTONS ON HOVER */
        .omnibus-row:hover .folder-actions .icon-btn { opacity: 1; }
        .omnibus-row:hover { background-color: rgba(0,0,0,0.2); }
        
        .icon-btn:hover { color: var(--text-main); background: rgba(255,255,255,0.1); border-radius: 4px; }
        .delete-btn:hover { color: red !important; }

        .delete-item-btn { opacity: 0; }
        .omnibus-item:hover .delete-item-btn { opacity: 1; }
        .omnibus-item:hover { background-color: var(--accent); color: white !important; }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: transparent; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
      `}</style>
    </aside>
  );
};

// --- STYLES ---
const panelStyle = { width: '250px', background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%' };
const contentAreaStyle = { flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column' };
const headerStyle = { padding: '10px', background: 'var(--bg-header)', borderBottom: '1px solid var(--border)', fontWeight: 'bold', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };

// UPDATED ROW STYLE
const rowStyle = { 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'space-between', // Ensures spread
  padding: '4px 8px', 
  borderBottom: '1px solid transparent', 
  minHeight: '28px' 
};

const tabContainerStyle = { display: 'flex', borderBottom: '1px solid var(--border)' };
const tabStyle = { flex: 1, background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '10px 5px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', borderBottom: '2px solid transparent' };
const activeTabStyle = { ...tabStyle, background: 'var(--bg-header)', color: 'var(--text-main)', borderBottom: '2px solid var(--accent)' };
const searchInputStyle = { width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '6px', borderRadius: '4px', fontSize: '12px', outline: 'none' };
const textAreaStyle = { width: '100%', height: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '14px', lineHeight: '1.5', outline: 'none', resize: 'none', padding: '15px' };

export default RightPanel;