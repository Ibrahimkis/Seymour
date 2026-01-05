import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react'; 
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'; 
import CharacterCount from '@tiptap/extension-character-count';
import Focus from '@tiptap/extension-focus'; 
import { useSearchParams, useNavigate } from 'react-router-dom';

import EditorToolbar from './EditorToolbar';
import EditorFooter from './EditorFooter'; 
import LoreHoverCard from './LoreHoverCard'; 
import TypographyControls from './TypographyControls'; 
import ChapterInspector from './ChapterInspector';
import EditorContextMenu from './EditorContextMenu'; // <--- NEW IMPORT
import CustomModal from '../../components/CustomModal';
import { useProject } from '../../context/ProjectContext';
import { LoreMark } from './LoreExtension';
import { GrammarExtension } from './GrammarExtension';

const EditorLayout = () => {
  const { projectData, setProjectData } = useProject();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const settings = projectData.settings || { fontSize: 18, zoom: 100, fontFamily: 'serif', customFonts: [] };

  const urlId = searchParams.get('id');
  const chapters = projectData.manuscript.chapters || [];
  let chapterIndex = 0;
  if (urlId) {
    const found = chapters.findIndex(c => c.id.toString() === urlId);
    if (found !== -1) chapterIndex = found;
  }
  const chapter = chapters[chapterIndex];

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved !== null ? JSON.parse(saved) : true; // Always true by default
  });
  const [status, setStatus] = useState('Saved');
  const [hoveredChar, setHoveredChar] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTypewriterMode, setIsTypewriterMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingChapterId, setPendingChapterId] = useState(null);
  
  // --- NEW: Context Menu State ---
  const [contextMenu, setContextMenu] = useState(null);

  const [localTitle, setLocalTitle] = useState(chapter?.title || '');
  const titleSaveTimer = useRef(null);

  useEffect(() => {
    if (chapter) {
      setLocalTitle(chapter.title);
    }
  }, [chapter?.id]);

  // --- CUSTOM FONT LOADER ---
  useEffect(() => {
    if (settings.customFonts) {
      settings.customFonts.forEach(font => {
        const fontFace = new FontFace(font.name, `url(${font.data})`);
        fontFace.load().then(loaded => document.fonts.add(loaded)).catch(e => console.error(e));
      });
    }
  }, [settings.customFonts]);

  // --- EDITOR ENGINE ---
  const editor = useEditor({
    extensions: [
      StarterKit,
      LoreMark,
      Underline,
      Image,
      Link.configure({ openOnClick: false }), 
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing your masterpiece...' }),
      CharacterCount,
      Focus.configure({
        className: 'has-focus',
        mode: 'all',
      }),
      BubbleMenuExtension.configure({
        element: null,
      }),
      GrammarExtension,
    ],
    content: chapter?.content || '',
    editorProps: { 
      attributes: { 
        class: 'seymour-editor',
        spellcheck: 'true' // <--- ENABLE SPELL CHECK
      },
    },
    onCreate: ({ editor }) => {
      // Set the current chapter ID when editor is created
      editor.storage.currentChapterId = chapter?.id;
    },
    onUpdate: () => {
      setStatus('Unsaved changes...');
      sessionStorage.setItem('hasUnsavedChanges', 'true');
    },
    onTransaction: ({ transaction, editor }) => {
      if (!isTypewriterMode || (!transaction.docChanged && !transaction.selectionSet)) return;

      requestAnimationFrame(() => {
        const { view } = editor;
        const { selection } = view.state;
        try {
          const node = view.domAtPos(selection.from).node;
          const element = node.nodeType === 1 ? node : node.parentElement;
          
          const container = document.getElementById('editor-workspace');
          if (container && element) {
            const elementRect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            const absoluteElementTop = elementRect.top + container.scrollTop;
            const targetScroll = absoluteElementTop - (containerRect.height / 2) + (elementRect.height / 2);

            container.scrollTo({
              top: targetScroll,
              behavior: 'smooth'
            });
          }
        } catch (e) {}
      });
    },
  });

  useEffect(() => {
    // Load chapter content when switching
    if (editor && chapter) {
      const hasChanges = sessionStorage.getItem('hasUnsavedChanges') === 'true';
      const currentId = editor.storage?.currentChapterId;
      const isDifferentChapter = currentId && currentId !== chapter.id;
      
      // If switching chapters with auto-save off and unsaved changes, show warning
      if (isDifferentChapter && !autoSaveEnabled && hasChanges) {
        setPendingChapterId(chapter.id);
        setShowUnsavedWarning(true);
        return; // Don't switch yet
      }
      
      // Load the chapter if it's different or empty
      if (isDifferentChapter || !currentId) {
        editor.commands.setContent(chapter.content || '');
        editor.storage.currentChapterId = chapter.id;
        setLocalTitle(chapter.title);
        setStatus('Saved');
        sessionStorage.removeItem('hasUnsavedChanges');
      }
    }
  }, [chapter?.id, editor, autoSaveEnabled]);

  // Separate effect for warning/saving on chapter switch
  useEffect(() => {
    let savedBeforeSwitch = false;
    
    return () => {
      if (savedBeforeSwitch) return;
      
      // Save if autosave is on
      if (editor && autoSaveEnabled && status === 'Unsaved changes...') {
        const content = editor.getHTML();
        const newManuscript = { ...projectData.manuscript };
        newManuscript.chapters[chapterIndex] = { ...chapter, content, title: localTitle };
        setProjectData({ ...projectData, manuscript: newManuscript });
        sessionStorage.removeItem('hasUnsavedChanges');
        savedBeforeSwitch = true;
      }
    };
  }, [chapter?.id]);

  // Handle warning modal actions
  const handleSaveAndSwitch = () => {
    if (editor) {
      saveChapter(editor.getHTML(), localTitle);
      setStatus('Saved');
      sessionStorage.removeItem('hasUnsavedChanges');
      setShowUnsavedWarning(false);
      
      // Check if navigating to lore or switching chapters
      if (window.pendingLoreNavigation) {
        const loreId = window.pendingLoreNavigation;
        window.pendingLoreNavigation = null;
        navigate(`/lore?id=${loreId}`);
      } else if (pendingChapterId) {
        // Force chapter reload
        const newChapter = projectData.manuscript.chapters.find(ch => ch.id === pendingChapterId);
        if (newChapter && editor) {
          editor.commands.setContent(newChapter.content);
          editor.storage.currentChapterId = newChapter.id;
          setLocalTitle(newChapter.title);
        }
      }
      setPendingChapterId(null);
    }
  };

  const handleDiscardAndSwitch = () => {
    sessionStorage.removeItem('hasUnsavedChanges');
    setShowUnsavedWarning(false);
    setStatus('Saved');
    
    // Check if navigating to lore or switching chapters
    if (window.pendingLoreNavigation) {
      const loreId = window.pendingLoreNavigation;
      window.pendingLoreNavigation = null;
      navigate(`/lore?id=${loreId}`);
    } else if (pendingChapterId && editor) {
      // Force chapter reload
      const newChapter = projectData.manuscript.chapters.find(ch => ch.id === pendingChapterId);
      if (newChapter && editor) {
        editor.commands.setContent(newChapter.content);
        editor.storage.currentChapterId = newChapter.id;
        setLocalTitle(newChapter.title);
      }
    }
    setPendingChapterId(null);
  };

  const handleCancelSwitch = () => {
    setShowUnsavedWarning(false);
    setPendingChapterId(null);
    window.pendingLoreNavigation = null;
  };

  useEffect(() => {
    if (!editor || !autoSaveEnabled) return;
    const saveTimer = setTimeout(() => {
      if (status === 'Unsaved changes...') {
        saveChapter(editor.getHTML(), chapter.title);
        setStatus('Saved');
        sessionStorage.setItem('hasUnsavedChanges', 'false');
      }
    }, 2000); // Save every 2 seconds
    return () => clearTimeout(saveTimer);
  }, [status, autoSaveEnabled, editor, chapter?.id]);

  const saveChapter = useCallback((newContent, newTitle) => {
    const newManuscript = { ...projectData.manuscript };
    newManuscript.chapters[chapterIndex] = { ...chapter, content: newContent, title: newTitle };
    setProjectData({ ...projectData, manuscript: newManuscript });
  }, [projectData, chapterIndex, chapter]);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    setStatus('Unsaved changes...');
    
    if (titleSaveTimer.current) {
      clearTimeout(titleSaveTimer.current);
    }
    
    if (autoSaveEnabled) {
      titleSaveTimer.current = setTimeout(() => {
        saveChapter(editor?.getHTML(), newTitle);
        setStatus('Saved');
      }, 2000); // Save 2 seconds after title change
    }
  };

  const handleManualSave = () => {
    if (editor) {
      saveChapter(editor.getHTML(), localTitle);
      setStatus('Saved');
    }
  };

  const applySmartLinks = () => {
    if (!editor || !projectData.lore.characters) return;
    const chain = editor.chain().focus();
    
    projectData.lore.characters.forEach(char => {
      const terms = [char.name, ...(char.aliases || [])];

      terms.forEach(term => {
        if (!term || term.trim().length < 2) return; 
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi'); 

        editor.state.doc.descendants((node, pos) => {
          if (node.isText) {
            let match;
            while ((match = regex.exec(node.text)) !== null) {
              const from = pos + match.index;
              const to = from + match[0].length;
              chain.setTextSelection({ from, to }).setMark('loreLink', { charId: char.id });
            }
          }
        });
      });
    });

    chain.run();
    setStatus('Links Updated!');
    setTimeout(() => setStatus('Saved'), 2000);
  };

  const handlePageMouseMove = (e) => {
    if (e.target.classList.contains('lore-link')) {
      const text = e.target.innerText;
      const char = projectData.lore.characters.find(c => 
        c.name.toLowerCase() === text.toLowerCase() || 
        (c.aliases && c.aliases.some(alias => alias.toLowerCase() === text.toLowerCase()))
      );

      if (char) {
        setHoveredChar(char);
        setMousePos({ x: e.clientX, y: e.clientY });
      }
    } else {
      setHoveredChar(null);
    }
  };

  const handleDoubleClick = (e) => {
    if (e.target.classList.contains('lore-link')) {
      const text = e.target.innerText;
      const char = projectData.lore.characters.find(c => 
        c.name.toLowerCase() === text.toLowerCase() || 
        (c.aliases && c.aliases.some(alias => alias.toLowerCase() === text.toLowerCase()))
      );
      if (char) {
        const hasUnsavedChanges = sessionStorage.getItem('hasUnsavedChanges') === 'true';
        
        // If auto-save is off and there are unsaved changes, show warning
        if (!autoSaveEnabled && hasUnsavedChanges) {
          setPendingChapterId(null); // Not switching chapters, navigating away
          setShowUnsavedWarning(true);
          // Store the intended navigation for later
          window.pendingLoreNavigation = char.id;
          return;
        }
        navigate(`/lore?id=${char.id}`);
      }
    }
  };

  // --- NEW: Right-Click Handler ---
  const handleContextMenu = (e) => {
    const isElectron = window.electronAPI !== undefined;
    
    // In Electron, always show custom menu
    // In browser, only show custom menu if text is selected (otherwise let native spell check show)
    if (!isElectron && (!editor || editor.state.selection.empty)) {
      // Let browser's native context menu show for spell check
      return;
    }
    
    e.preventDefault();

    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });

    // Clear previous spell check data
    window.spellCheckWord = null;
  };

  // --- NEW: Close context menu on click ---
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // --- Listen for unsaved warning trigger from LoreHoverCard ---
  useEffect(() => {
    const handleShowWarning = () => {
      setShowUnsavedWarning(true);
      setPendingChapterId(null); // Not switching chapters
    };
    window.addEventListener('showUnsavedWarning', handleShowWarning);
    return () => window.removeEventListener('showUnsavedWarning', handleShowWarning);
  }, []);

  // --- NEW: Ctrl + Mouse Wheel Zoom ---
  useEffect(() => {
    const handleWheel = (e) => {
      // Check if Ctrl is pressed and we're in the editor workspace
      if (e.ctrlKey && e.target.closest('#editor-workspace')) {
        e.preventDefault(); // Prevent browser zoom
        
        const delta = e.deltaY > 0 ? -10 : 10; // Negative delta = zoom in
        const newZoom = Math.max(50, Math.min(200, settings.zoom + delta));
        
        // Update the zoom setting
        const newSettings = { ...settings, zoom: newZoom };
        setProjectData({
          ...projectData,
          settings: newSettings
        });
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [settings, projectData, setProjectData]);

  const CustomBubbleMenu = ({ editor }) => {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ left: 0, top: 0 });

    useEffect(() => {
      if (!editor) return;
      const update = () => {
        const { from, to } = editor.state.selection;
        if (!editor || from === to) { setVisible(false); return; }
        try {
          const start = editor.view.coordsAtPos(from);
          const end = editor.view.coordsAtPos(to);
          const left = ((start.left + end.right) / 2) + window.pageXOffset;
          const top = Math.min(start.top, end.top) - 44 + window.pageYOffset;
          setPos({ left, top });
          setVisible(true);
        } catch (err) { setVisible(false); }
      };
      editor.on('selectionUpdate', update);
      editor.on('transaction', update);
      update();
      return () => {
        editor.off('selectionUpdate', update);
        editor.off('transaction', update);
      };
    }, [editor]);

    if (!editor || !visible) return null;

    return (
      <div style={{ position: 'absolute', left: pos.left, top: pos.top, zIndex: 2000, transform: 'translateX(-50%)' }}>
        <div style={bubbleMenuStyle}>
          <button onClick={() => editor.chain().focus().toggleBold().run()} style={editor.isActive('bold') ? activeBubbleBtn : bubbleBtn}>B</button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} style={editor.isActive('italic') ? activeBubbleBtn : bubbleBtn}>I</button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} style={editor.isActive('underline') ? activeBubbleBtn : bubbleBtn}>U</button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()} style={editor.isActive('strike') ? activeBubbleBtn : bubbleBtn}>S</button>
        </div>
      </div>
    );
  };

  if (!chapter) return <div style={{padding: 40}}>No chapters found. Create one in the Binder.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {hoveredChar && <LoreHoverCard character={hoveredChar} position={mousePos} />}
      
      <div style={centeredHeaderStyle}>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EditorToolbar editor={editor} />
            <TypographyControls /> 
            <div style={{width: '1px', height: '20px', background: '#555', margin: '0 5px'}}></div>
            <button onClick={() => setIsTypewriterMode(!isTypewriterMode)} style={isTypewriterMode ? activeMagicBtnStyle : magicBtnStyle} title="Typewriter Mode">⌨️</button>
            <button onClick={() => setIsFocusMode(!isFocusMode)} style={isFocusMode ? activeMagicBtnStyle : magicBtnStyle} title="Focus Mode">🎯</button>
            <button onClick={applySmartLinks} style={magicBtnStyle} title="Scan for Lore">🪄 Link Lore</button>
            <button onClick={() => setShowInspector(!showInspector)} style={showInspector ? activeMagicBtnStyle : magicBtnStyle} title="Chapter Inspector">🔎</button>
        </div>
        <div style={rightStatusAreaStyle}>
          <span style={{ fontSize: '11px', color: status === 'Saved' ? 'var(--text-muted)' : 'var(--accent)' }}>{status}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* MAIN EDITOR WORKSPACE */}
        <div 
          id="editor-workspace" 
          style={workspaceStyle} 
          className={`${isTypewriterMode ? 'typewriter-active' : ''} ${isFocusMode ? 'focus-mode-active' : ''}`}
          onContextMenu={handleContextMenu} // <--- RIGHT-CLICK HANDLER
        >
          <div style={{
            ...pageContainerStyle,
            transform: `scale(${settings.zoom / 100})`,
            transformOrigin: 'top center'
          }} onMouseMove={handlePageMouseMove} onDoubleClick={handleDoubleClick}>
            <input 
              type="text" 
              value={localTitle} 
              onChange={handleTitleChange} 
              style={titleInputStyle} 
              placeholder="Chapter Title" 
            />
            <div style={{
              ...editorWrapperStyle,
              fontSize: `${settings.fontSize}px`,
              fontFamily: settings.fontFamily
            }}>
              {editor && <CustomBubbleMenu editor={editor} />}
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {showInspector && <ChapterInspector chapterId={chapter.id} />}
        
      </div>

      <EditorFooter editor={editor} />
      
      {/* CONTEXT MENU */}
      {contextMenu && (
        <EditorContextMenu 
          editor={editor}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* UNSAVED CHANGES WARNING */}
      <CustomModal
        isOpen={showUnsavedWarning}
        onClose={handleCancelSwitch}
        title="⚠️ Unsaved Changes"
      >
        <p style={{ marginBottom: '15px', color: 'var(--text-main)' }}>
          You have unsaved changes and auto-save is currently disabled. 
          What would you like to do?
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSaveAndSwitch}
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Save and Switch
          </button>
          <button
            onClick={() => {
              setAutoSaveEnabled(true);
              localStorage.setItem('autoSaveEnabled', 'true');
              handleSaveAndSwitch();
            }}
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Enable Auto-Save
          </button>
          <button
            onClick={handleDiscardAndSwitch}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Discard Changes
          </button>
          <button
            onClick={handleCancelSwitch}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </CustomModal>
    </div>
  );
};

// --- STYLES ---
const centeredHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-header)', borderBottom: '1px solid var(--border)', height: '45px', padding: '0 15px', flexShrink: 0 };
const rightStatusAreaStyle = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px', fontSize: '12px' };
const workspaceStyle = { flex: 1, background: 'var(--bg-app)', overflowY: 'auto', padding: '0', display: 'block', scrollBehavior: 'smooth' };
const pageContainerStyle = { width: '800px', maxWidth: '100%', minHeight: '1000px', height: 'auto', background: 'var(--paper)', boxShadow: 'none', padding: '100px 80px', borderRadius: '2px', margin: '0 auto', transition: 'transform 0.2s ease' };
const titleInputStyle = { width: '100%', background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border)', fontSize: '28px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '30px', outline: 'none', paddingBottom: '10px', textAlign: 'center' };
const editorWrapperStyle = { color: 'var(--text-main)', lineHeight: '1.8' };
const magicBtnStyle = { background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };
const activeMagicBtnStyle = { ...magicBtnStyle, background: 'var(--accent)', color: 'white' };
const bubbleMenuStyle = { background: '#111', border: '1px solid #444', borderRadius: '6px', display: 'flex', padding: '2px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' };
const bubbleBtn = { background: 'transparent', border: 'none', color: '#ccc', padding: '5px 10px', cursor: 'pointer', fontWeight: 'bold' };
const activeBubbleBtn = { ...bubbleBtn, color: 'var(--accent)' };

const styleTag = document.createElement("style");
styleTag.innerHTML = `
  .seymour-editor p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #555; pointer-events: none; height: 0; }
  .seymour-editor img { max-width: 100%; border-radius: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
  .seymour-editor blockquote { border-left: 3px solid var(--accent); margin-left: 0; padding-left: 15px; color: #888; font-style: italic; }
  .seymour-editor a { color: var(--accent); cursor: pointer; text-decoration: underline; }
  .typewriter-active .seymour-editor { padding-top: 40vh !important; padding-bottom: 60vh !important; }
  .focus-mode-active .seymour-editor > * { opacity: 0.15 !important; transition: opacity 0.3s ease; }
  .focus-mode-active .seymour-editor .has-focus { opacity: 1 !important; }
  .focus-mode-active .ProseMirror-focused .has-focus { opacity: 1 !important; }
  .seymour-editor { outline: none; }
  
  /* Lore link styling */
  .lore-link {
    color: var(--accent);
    border-bottom: 1px dotted var(--accent);
    cursor: pointer;
    transition: all 0.2s;
  }
  .lore-link:hover {
    background: rgba(92, 139, 214, 0.1);
    border-bottom-style: solid;
  }
`;
document.head.appendChild(styleTag);

export default EditorLayout;