// src/features/editor/EditorContextMenu.jsx
// Right-click context menu for editor with lore integration

import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import CustomModal from '../../components/CustomModal';

const EditorContextMenu = ({ editor, position, onClose }) => {
  const { projectData, setProjectData } = useProject();
  const [showLoreModal, setShowLoreModal] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'create' or 'addTo'
  const [selectedText, setSelectedText] = useState('');
  const [suggestedType, setSuggestedType] = useState('Character');
  const [synonyms, setSynonyms] = useState([]);
  const [loadingSynonyms, setLoadingSynonyms] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const selection = editor.state.selection;
    const text = editor.state.doc.textBetween(selection.from, selection.to, ' ');
    setSelectedText(text);
    
    // Smart type detection
    setSuggestedType(detectType(text));

    // Fetch synonyms if single word is selected
    if (text && text.trim().split(/\s+/).length === 1) {
      const apiKey = localStorage.getItem('mw_thesaurus_key');
      
      if (!apiKey) {
        setSynonyms([]);
        return;
      }

      setLoadingSynonyms(true);
      const word = text.trim().toLowerCase();
      
      fetch(`https://www.dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(word)}?key=${apiKey}`)
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data) || data.length === 0) {
            setSynonyms([]);
            return;
          }

          // Handle "word not found" response (array of strings instead of objects)
          if (typeof data[0] === 'string') {
            setSynonyms([]);
            return;
          }

          // Extract synonyms from the first entry
          const entry = data[0];
          const allSyns = [];
          
          if (entry.meta && entry.meta.syns && Array.isArray(entry.meta.syns)) {
            // meta.syns is an array of arrays (grouped by sense)
            entry.meta.syns.forEach(synGroup => {
              if (Array.isArray(synGroup)) {
                allSyns.push(...synGroup);
              }
            });
          }
          
          // Remove duplicates and limit to 8
          const uniqueSyns = [...new Set(allSyns)].slice(0, 8);
          setSynonyms(uniqueSyns);
        })
        .catch(err => {
          console.error('Failed to fetch synonyms:', err);
          setSynonyms([]);
        })
        .finally(() => setLoadingSynonyms(false));
    } else {
      setSynonyms([]);
    }
  }, [editor]);

  // --- SMART TYPE DETECTION ---
  const detectType = (text) => {
    if (!text) return 'Character';
    
    const lower = text.toLowerCase();
    
    // Location indicators
    const locationWords = ['forest', 'city', 'kingdom', 'castle', 'mountain', 'river', 'sea', 'island', 'valley', 'cave', 'temple', 'tower', 'village', 'town', 'plains', 'desert'];
    if (locationWords.some(word => lower.includes(word))) return 'Location';
    
    // Check if it starts with "The" (often locations/groups)
    if (text.startsWith('The ')) return 'Location';
    
    // Race/species indicators
    const raceWords = ['elf', 'dwarf', 'orc', 'goblin', 'dragon', 'human', 'race', 'tribe', 'clan', 'folk'];
    if (raceWords.some(word => lower.includes(word))) return 'Race';
    
    // Default to Character for single capitalized words
    return 'Character';
  };

  // --- CONTEXT MENU ACTIONS ---
  const handleCopy = (e) => {
    e.stopPropagation();
    document.execCommand('copy');
    onClose();
  };

  const handlePaste = (e) => {
    e.stopPropagation();
    document.execCommand('paste');
    onClose();
  };

  const handleCut = (e) => {
    e.stopPropagation();
    document.execCommand('cut');
    onClose();
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    editor?.commands.selectAll();
    onClose();
  };

  const handleCreateLoreCard = (e) => {
    e.stopPropagation();
    setModalMode('create');
    setShowLoreModal(true);
  };

  const handleAddToExisting = (e) => {
    e.stopPropagation();
    setModalMode('addTo');
    setShowLoreModal(true);
  };

  const handleReplaceSynonym = (synonym) => {
    if (!editor) return;
    editor.chain().focus().insertContent(synonym).run();
    onClose();
  };

  const hasApiKey = () => {
    return localStorage.getItem('mw_thesaurus_key') !== null;
  };

  const handleSetApiKey = () => {
    const key = prompt('Enter your Merriam-Webster Thesaurus API key:\n\n(Get one free at: dictionaryapi.com)');
    if (key && key.trim()) {
      localStorage.setItem('mw_thesaurus_key', key.trim());
      alert('API key saved! Right-click again to use the thesaurus.');
      onClose();
    }
  };

  if (!position) return null;

  return (
    <>
      <div 
        style={{
          ...menuStyle,
          left: position.x,
          top: position.y
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* STANDARD EDIT OPERATIONS */}
        <div style={sectionStyle}>Standard</div>
        <button onClick={handleCut} style={itemStyle}>✂️ Cut</button>
        <button onClick={handleCopy} style={itemStyle}>📋 Copy</button>
        <button onClick={handlePaste} style={itemStyle}>📄 Paste</button>
        <div style={dividerStyle}></div>
        <button onClick={handleSelectAll} style={itemStyle}>🔲 Select All</button>
        
        {/* SYNONYMS (only show if single word is selected) */}
        {selectedText && selectedText.trim().split(/\s+/).length === 1 && (
          <>
            <div style={dividerStyle}></div>
            <div style={sectionStyle}>✨ Synonyms for "{selectedText.slice(0, 15)}{selectedText.length > 15 ? '...' : ''}"</div>
            {!hasApiKey() ? (
              <button onClick={handleSetApiKey} style={{ ...itemStyle, color: 'var(--accent)' }}>
                🔑 Set API Key (Free at dictionaryapi.com)
              </button>
            ) : loadingSynonyms ? (
              <div style={{ ...itemStyle, cursor: 'default', opacity: 0.6 }}>Loading...</div>
            ) : synonyms.length > 0 ? (
              synonyms.map((syn, idx) => (
                <button key={idx} onClick={() => handleReplaceSynonym(syn)} style={itemStyle}>
                  {syn}
                </button>
              ))
            ) : (
              <div style={{ ...itemStyle, cursor: 'default', opacity: 0.6 }}>No synonyms found</div>
            )}
          </>
        )}
        
        {/* LORE OPERATIONS (only show if text is selected) */}
        {selectedText && (
          <>
            <div style={dividerStyle}></div>
            <div style={sectionStyle}>Lore Tools</div>
            <button onClick={handleCreateLoreCard} style={itemStyle}>
              ➕ Create "{selectedText.slice(0, 20)}{selectedText.length > 20 ? '...' : ''}" as Lore
            </button>
            <button onClick={handleAddToExisting} style={itemStyle}>
              📌 Add to Existing Lore Card
            </button>
          </>
        )}
      </div>

      {/* LORE MODALS */}
      {showLoreModal && modalMode === 'create' && (
        <CreateLoreModal
          selectedText={selectedText}
          suggestedType={suggestedType}
          projectData={projectData}
          setProjectData={setProjectData}
          onClose={() => {
            setShowLoreModal(false);
            onClose();
          }}
          editor={editor}
        />
      )}

      {showLoreModal && modalMode === 'addTo' && (
        <AddToExistingModal
          selectedText={selectedText}
          projectData={projectData}
          setProjectData={setProjectData}
          onClose={() => {
            setShowLoreModal(false);
            onClose();
          }}
        />
      )}
    </>
  );
};

// ==========================================
// CREATE NEW LORE CARD MODAL
// ==========================================
const CreateLoreModal = ({ selectedText, suggestedType, projectData, setProjectData, onClose, editor }) => {
  const [name, setName] = useState(selectedText);
  const [type, setType] = useState(suggestedType);
  const [folder, setFolder] = useState('root_misc'); // Default folder
  const [createLink, setCreateLink] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false); // Prevent double-click

  // Get folder options
  const folders = projectData.lore?.folders || [];
  const rootFolders = folders.filter(f => f.parentId === null);

  const handleCreate = () => {
    if (isCreating) return; // Prevent double submission
    setIsCreating(true);

    const newEntity = {
      id: Date.now(),
      name: name,
      type: type,
      aliases: [],
      folderId: folder, // Use selected folder
      imageSrc: null,
      biography: '',
      sections: []
    };

    // Add to project
    const newCharacters = [...(projectData.lore.characters || []), newEntity];
    setProjectData({
      ...projectData,
      lore: { ...projectData.lore, characters: newCharacters }
    });

    // Create smart link in editor if checkbox is checked
    if (createLink && editor) {
      editor.chain().focus().setMark('loreLink', { charId: newEntity.id }).run();
    }

    // Show success message
    const folderName = folders.find(f => f.id === folder)?.name || 'Unsorted';
    setSuccessMessage(`Created "${name}" as ${type} in ${folderName}`);
    setShowSuccess(true);
  };

  return (
    <>
      <CustomModal
        isOpen={showSuccess}
        type="alert"
        title="✅ Lore Card Created"
        message={successMessage}
        onConfirm={() => {
          setShowSuccess(false);
          onClose(); // Close everything
        }}
        onCancel={() => {
          setShowSuccess(false);
          onClose();
        }}
      />
      
      {!showSuccess && ( // Only show creation modal if success modal is not showing
        <div style={overlayStyle} onClick={onClose}>
          <div style={modalBoxStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>Create New Lore Card</h3>
            
            <label style={labelStyle}>Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              autoFocus
            />

            <label style={labelStyle}>Type (Suggestion: {suggestedType})</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="Character">Character</option>
              <option value="Location">Location</option>
              <option value="Race">Race/Species</option>
              <option value="Faction">Faction/Group</option>
              <option value="Item">Item/Artifact</option>
              <option value="Concept">Concept/Magic</option>
              <option value="Event">Event</option>
              <option value="Other">Other</option>
            </select>

            <label style={labelStyle}>Folder</label>
            <select value={folder} onChange={(e) => setFolder(e.target.value)} style={inputStyle}>
              {rootFolders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>

            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}>
              <input 
                type="checkbox" 
                checked={createLink} 
                onChange={(e) => setCreateLink(e.target.checked)}
              />
              <span>Create smart link in editor</span>
            </label>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
              <button 
                onClick={handleCreate} 
                disabled={!name || isCreating} 
                style={confirmBtnStyle}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ==========================================
// ADD TO EXISTING LORE CARD MODAL
// ==========================================
const AddToExistingModal = ({ selectedText, projectData, setProjectData, onClose }) => {
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isAdding, setIsAdding] = useState(false); // Prevent double-click

  const entities = projectData.lore.characters || [];
  const filteredEntities = entities.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddToEntity = () => {
    if (!selectedEntityId || isAdding) return;
    setIsAdding(true);

    const entityIndex = entities.findIndex(e => e.id === selectedEntityId);
    if (entityIndex === -1) return;

    const entity = entities[entityIndex];

    // Create new "Uncategorized" section if it doesn't exist
    let sections = entity.sections || [];
    let uncategorizedSection = sections.find(s => s.title === 'Uncategorized');

    if (!uncategorizedSection) {
      uncategorizedSection = {
        id: Date.now(),
        title: 'Uncategorized',
        blocks: []
      };
      sections = [...sections, uncategorizedSection];
    }

    // Add new block with the selected text
    const newBlock = {
      id: Date.now(),
      label: 'Note from Manuscript',
      content: selectedText
    };

    uncategorizedSection.blocks.push(newBlock);

    // Update entity
    const updatedEntity = { ...entity, sections };
    const newCharacters = [...entities];
    newCharacters[entityIndex] = updatedEntity;

    setProjectData({
      ...projectData,
      lore: { ...projectData.lore, characters: newCharacters }
    });

    // Show success message
    setSuccessMessage(`Added to "${entity.name}" in Uncategorized section`);
    setShowSuccess(true);
  };

  return (
    <>
      <CustomModal
        isOpen={showSuccess}
        type="alert"
        title="✅ Added to Lore Card"
        message={successMessage}
        onConfirm={() => {
          setShowSuccess(false);
          onClose(); // Close everything
        }}
        onCancel={() => {
          setShowSuccess(false);
          onClose();
        }}
      />
      
      {!showSuccess && ( // Only show add modal if success modal is not showing
        <div style={overlayStyle} onClick={onClose}>
          <div style={modalBoxStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>Add to Existing Lore Card</h3>
            
            <div style={{ marginBottom: '15px', padding: '10px', background: 'var(--bg-app)', borderRadius: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
              "{selectedText}"
            </div>

            <label style={labelStyle}>Search Lore Cards</label>
            <input 
              type="text" 
              placeholder="🔍 Type to search..."
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
              autoFocus
            />

            <div style={listStyle}>
              {filteredEntities.map(entity => (
                <div 
                  key={entity.id}
                  onClick={() => setSelectedEntityId(entity.id)}
                  style={{
                    ...listItemStyle,
                    background: selectedEntityId === entity.id ? 'var(--accent)' : 'var(--bg-app)',
                    color: selectedEntityId === entity.id ? 'white' : 'var(--text-main)'
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{entity.name}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>{entity.type || 'Entity'}</div>
                </div>
              ))}
              {filteredEntities.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No lore cards found
                </div>
              )}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
              ℹ️ Text will be added to "Uncategorized" section. You can move it later.
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
              <button 
                onClick={handleAddToEntity} 
                disabled={!selectedEntityId || isAdding} 
                style={confirmBtnStyle}
              >
                {isAdding ? 'Adding...' : 'Add to Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- STYLES ---
const menuStyle = {
  position: 'fixed',
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  minWidth: '220px',
  zIndex: 9999,
  padding: '4px 0'
};

const itemStyle = {
  width: '100%',
  padding: '8px 12px',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-main)',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: '13px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const sectionStyle = {
  padding: '4px 12px',
  fontSize: '10px',
  fontWeight: 'bold',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

const dividerStyle = {
  height: '1px',
  background: 'var(--border)',
  margin: '4px 0'
};

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000
};

const modalBoxStyle = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '20px',
  width: '450px',
  maxWidth: '90%',
  boxShadow: '0 10px 40px rgba(0,0,0,0.7)'
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: 'var(--text-muted)',
  marginBottom: '5px',
  marginTop: '10px'
};

const inputStyle = {
  width: '100%',
  padding: '8px',
  background: 'var(--bg-app)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-main)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box'
};

const listStyle = {
  maxHeight: '300px',
  overflowY: 'auto',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  marginTop: '10px'
};

const listItemStyle = {
  padding: '10px',
  cursor: 'pointer',
  borderBottom: '1px solid var(--border)',
  transition: 'all 0.2s'
};

const cancelBtnStyle = {
  flex: 1,
  padding: '8px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: '13px'
};

const confirmBtnStyle = {
  flex: 1,
  padding: '8px',
  background: 'var(--accent)',
  border: 'none',
  borderRadius: '4px',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 'bold'
};

// Add hover styles
const styleTag = document.createElement("style");
styleTag.innerHTML = `
  button:hover:not(:disabled) { background-color: rgba(255,255,255,0.1) !important; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
`;
document.head.appendChild(styleTag);

export default EditorContextMenu;