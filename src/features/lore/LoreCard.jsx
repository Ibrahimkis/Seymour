import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AutoResizeTextarea from '../../components/AutoResizeTextarea';
import ImageEditorModal from '../../components/ImageEditorModal';
import { useProject } from '../../context/ProjectContext'; 
import CustomModal from '../../components/CustomModal'; 

// ==========================================
// PART 1: THE EXPLORER
// ==========================================
const DatabaseExplorer = ({ projectData, setProjectData, searchParams, setSearchParams }) => {
  const currentFolderId = searchParams.get('folderId') || null;
  const folders = projectData.lore.folders || [];
  const items = projectData.lore.characters || [];
  const currentFolders = folders.filter(f => f.parentId === currentFolderId);
  const currentItems = items.filter(i => i.folderId === currentFolderId);
  const currentFolder = folders.find(f => f.id === currentFolderId);

  const [modal, setModal] = useState({ isOpen: false, type: 'input', title: '', onConfirm: () => {} });

  // --- ACTIONS ---
  const openFolder = (folderId) => setSearchParams({ folderId });
  const openItem = (itemId) => setSearchParams({ id: itemId });
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
          type: 'Character', 
          imageSrc: null, 
          biography: '', // <--- NEW DEDICATED FIELD
          sections: [] // We don't need a default section anymore since Bio is separate
        };
        setProjectData({ ...projectData, lore: { ...projectData.lore, characters: [...items, newEntity] } });
        setModal({ ...modal, isOpen: false });
      }
    });
  };

  const deleteItem = (id, type) => {
    if(!window.confirm("Delete this?")) return;
    if(type === 'folder') {
        const newFolders = folders.filter(f => f.id !== id);
        setProjectData({ ...projectData, lore: { ...projectData.lore, folders: newFolders } });
    } else {
        const newItems = items.filter(i => i.id !== id);
        setProjectData({ ...projectData, lore: { ...projectData.lore, characters: newItems } });
    }
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
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', paddingBottom: '15px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={goUp} disabled={!currentFolderId} style={{ ...navBtnStyle, opacity: currentFolderId ? 1 : 0.3 }}>⬆ Up</button>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}> / {currentFolder ? currentFolder.name : 'Home'}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={createFolder} style={actionBtnStyle}>+ New Folder</button>
            <button onClick={createEntity} style={{...actionBtnStyle, background: 'var(--accent)', color: 'white', border: 'none'}}>+ New Entity</button>
        </div>
      </div>

      {/* GRID */}
      <div style={gridContainerStyle}>
        {currentFolders.map(folder => (
          <div key={folder.id} onClick={() => openFolder(folder.id)} style={cardStyle} className="explorer-card">
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
            <div style={cardNameStyle}>{folder.name}</div>
            <div style={cardMetaStyle}>Folder</div>
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
  );
};


// ==========================================
// PART 2: THE CHARACTER SHEET
// ==========================================
const CharacterSheet = ({ character, projectData, setProjectData, charIndex }) => {
  const [tempImageSrc, setTempImageSrc] = useState(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  const updateCharacter = (updates) => {
    const newLore = { ...projectData.lore };
    const updatedChar = { ...character, ...updates };
    newLore.characters[charIndex] = updatedChar;
    setProjectData({ ...projectData, lore: newLore });
  };

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
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setTempImageSrc(reader.result); setIsEditingImage(true); };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
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
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px' }}>
      <CustomModal isOpen={modal.isOpen} type={modal.type} title={modal.title} message={modal.message} onConfirm={modal.onConfirm} onCancel={closeModal} />
      {isEditingImage && <ImageEditorModal imageSrc={tempImageSrc} onSave={handleSaveImage} onCancel={() => setIsEditingImage(false)} />}
      
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

          {/* --- NEW DEDICATED BIOGRAPHY BOX --- */}
          <div style={{ marginTop: '15px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '5px', letterSpacing: '1px' }}>BIOGRAPHY / DESCRIPTION</div>
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '4px', padding: '10px' }}>
              <AutoResizeTextarea 
                value={character.biography || ""} 
                onChange={(val) => updateCharacter({ biography: val })} 
                placeholder="Write a brief biography or description..."
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

      {/* SECTIONS */}
      {(character.sections || []).map((section) => (
        <div key={section.id} style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--border)' }}>
            <input type="text" value={section.title} onChange={(e) => updateSectionTitle(section.id, e.target.value)} style={sectionTitleStyle} />
            <button onClick={() => deleteSection(section.id)} style={deleteBtnStyle}>Delete Section</button>
          </div>
          <div style={gridStyle}>
            {section.blocks.map((block) => (
              <div key={block.id} style={blockStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <input type="text" value={block.label} onChange={(e) => updateBlock(section.id, block.id, 'label', e.target.value)} style={labelInputStyle} />
                  <button onClick={() => deleteBlock(section.id, block.id)} style={xBtnStyle}>✕</button>
                </div>
                <div style={contentBoxStyle}><AutoResizeTextarea value={block.content} onChange={(val) => updateBlock(section.id, block.id, 'content', val)} /></div>
              </div>
            ))}
            <button onClick={() => addBlock(section.id)} style={addBlockBtnStyle}>+ Add Field</button>
          </div>
        </div>
      ))}
      <button onClick={addSection} style={addSectionBtnStyle}>+ Create New Section</button>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const LoreCard = () => {
  const { projectData, setProjectData } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();

  if (!projectData || !projectData.lore) return <div style={{ padding: '40px', color: '#888' }}>Loading...</div>;

  const urlId = searchParams.get('id');

  if (urlId) {
    const charIndex = projectData.lore.characters.findIndex(c => c.id.toString() === urlId);
    if (charIndex === -1) return <div style={{padding: 40}}>Entity not found. <button onClick={() => setSearchParams({})}>Go Back</button></div>;
    return <CharacterSheet character={projectData.lore.characters[charIndex]} projectData={projectData} setProjectData={setProjectData} charIndex={charIndex} />;
  } else {
    return <DatabaseExplorer projectData={projectData} setProjectData={setProjectData} searchParams={searchParams} setSearchParams={setSearchParams} />;
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

export default LoreCard;