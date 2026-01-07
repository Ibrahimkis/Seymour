import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react'; 
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Focus from '@tiptap/extension-focus'; 
import { useSearchParams, useNavigate } from 'react-router-dom';

import EditorToolbar from './EditorToolbar';
import EditorFooter from './EditorFooter'; 
import LoreHoverCard from './LoreHoverCard'; 
import TypographyControls from './TypographyControls'; 
import ChapterInspector from './ChapterInspector';
import EditorContextMenu, { CreateLoreModal, AddToExistingModal } from './EditorContextMenu'; // <--- NEW IMPORT
import CustomModal from '../../components/CustomModal';
import { useProject } from '../../context/ProjectContext';
import { LoreMark } from './LoreExtension';

const EditorLayout = () => {
  const { projectData, setProjectData, saveNowSilently, saveStatus, setSaveStatus } = useProject();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Prefer native Electron context menu (spellcheck, OS-like UX). Custom menu is used as a fallback.
  const useNativeContextMenu = !!window.electronAPI;

  // Use ref to access latest projectData without causing re-renders
  const projectDataRef = useRef(projectData);
  useEffect(() => {
    projectDataRef.current = projectData;
  }, [projectData]);

  const settings = projectData.settings || { fontSize: 18, zoom: 100, fontFamily: 'serif', customFonts: [] };
  
  // Keep settings in ref to avoid circular dependency
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const urlId = searchParams.get('id');
  const chapters = projectData.manuscript.chapters || [];
  
  // Also keep chapters in a ref for effects
  const chaptersRef = useRef(chapters);
  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);
  
  let chapterIndex = 0;
  if (urlId) {
    const found = chapters.findIndex(c => c.id.toString() === urlId);
    if (found !== -1) chapterIndex = found;
  }
  
  // Memoize chapter to prevent new references when content hasn't changed
  const chapter = useMemo(() => chapters[chapterIndex], [chapters, chapterIndex]);

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved !== null ? JSON.parse(saved) : true; // Always true by default
  });
  const [hoveredChar, setHoveredChar] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTypewriterMode, setIsTypewriterMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingChapterId, setPendingChapterId] = useState(null);
  
  // --- NEW: Context Menu State ---
  const [contextMenu, setContextMenu] = useState(null);

  // Native menu Lore actions
  const [nativeLoreAction, setNativeLoreAction] = useState(null);

  const detectLoreType = (text) => {
    if (!text) return 'Character';
    const lower = String(text).toLowerCase();
    const locationWords = ['forest', 'city', 'kingdom', 'castle', 'mountain', 'river', 'sea', 'island', 'valley', 'cave', 'temple', 'tower', 'village', 'town', 'plains', 'desert'];
    if (locationWords.some((word) => lower.includes(word))) return 'Location';
    if (String(text).startsWith('The ')) return 'Location';
    const raceWords = ['elf', 'dwarf', 'orc', 'goblin', 'dragon', 'human', 'race', 'tribe', 'clan', 'folk'];
    if (raceWords.some((word) => lower.includes(word))) return 'Race';
    return 'Character';
  };

  // Native context menu -> open Lore modals
  useEffect(() => {
    if (!window.electronAPI?.onNativeContextLore) return;

    const handler = (payload) => {
      const action = payload?.action;
      const text = String(payload?.text || '').trim();
      if (!text) return;
      if (action !== 'create' && action !== 'addTo') return;

      setNativeLoreAction({ mode: action, text });
    };

    window.electronAPI.onNativeContextLore(handler);
    return () => {
      window.electronAPI?.removeAllListeners?.('native-context-lore');
    };
  }, []);

  // Track latest context menu position to avoid stale closure issues in async handlers
  const contextMenuRef = useRef(contextMenu);
  useEffect(() => {
    contextMenuRef.current = contextMenu;
  }, [contextMenu]);

  // Track the word + document range we right-clicked so we can apply spell fixes.
  const pendingSpellcheckRef = useRef(null);

  const [localTitle, setLocalTitle] = useState(chapter?.title || '');
  const titleSaveTimer = useRef(null);
  
  // Keep localTitle in ref to avoid circular dependency
  const localTitleRef = useRef(localTitle);
  useEffect(() => {
    localTitleRef.current = localTitle;
  }, [localTitle]);

  useEffect(() => {
    if (chapter) {
      setLocalTitle(chapter.title);
    }
  }, [chapter?.id]);

  // --- CUSTOM FONT LOADER ---
  useEffect(() => {
    const currentSettings = settingsRef.current;
    if (currentSettings.customFonts) {
      currentSettings.customFonts.forEach(font => {
        const fontFace = new FontFace(font.name, `url(${font.data})`);
        fontFace.load().then(loaded => document.fonts.add(loaded)).catch(e => console.error(e));
      });
    }
  }, []); // Empty dependency - only load fonts once on mount

  // --- EDITOR ENGINE ---
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
        },
      }),
      LoreMark,
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing your masterpiece...' }),
      CharacterCount,
      Focus.configure({
        className: 'has-focus',
        mode: 'all',
      }),
    ],
    content: '', // Initialize empty - content loaded by useEffect
    editorProps: { 
      attributes: { 
        class: 'seymour-editor',
        spellcheck: 'true' // <--- ENABLE SPELL CHECK
      },
    },
    onCreate: ({ editor }) => {
      // Set the current chapter ID when editor is created
      // Chapter will be loaded by useEffect
      editor.storage.currentChapterId = null;
    },
    onUpdate: () => {
      setSaveStatus('Unsaved changes...');
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

  // Listen for force save events (when user clicks away)
  useEffect(() => {
    if (!editor) return; // Don't register listeners until editor exists
    
    const handleForceSave = () => {
      if (autoSaveEnabled && saveStatus === 'Unsaved changes...') {
        const currentChapters = chaptersRef.current;
        const currentChapterIndex = currentChapters.findIndex(c => c.id === editor.storage?.currentChapterId);
        if (currentChapterIndex !== -1) {
          const content = editor.getHTML();
          const currentChapter = currentChapters[currentChapterIndex];
          const newManuscript = { ...projectDataRef.current.manuscript };
          newManuscript.chapters[currentChapterIndex] = { 
            ...currentChapter, 
            content, 
            title: localTitleRef.current 
          };
          setProjectData({ ...projectDataRef.current, manuscript: newManuscript });
          setSaveStatus('Saved');
          sessionStorage.removeItem('hasUnsavedChanges');
        }
      }
    };

    window.addEventListener('force-save-chapter', handleForceSave);
    window.addEventListener('force-save-all', handleForceSave);
    return () => {
      window.removeEventListener('force-save-chapter', handleForceSave);
      window.removeEventListener('force-save-all', handleForceSave);
    };
  }, [editor, autoSaveEnabled, saveStatus, setProjectData, setSaveStatus]);

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
        setSaveStatus('Saved');
        sessionStorage.removeItem('hasUnsavedChanges');
      }
    }
  }, [chapter?.id, editor, autoSaveEnabled]);

  // Separate effect for saving on chapter switch
  useEffect(() => {
    return () => {
      // Save if autosave is on and there are unsaved changes
      if (editor && autoSaveEnabled && saveStatus === 'Unsaved changes...') {
        const currentChapters = chaptersRef.current;
        const currentChapterIndex = currentChapters.findIndex(c => c.id === editor.storage?.currentChapterId);
        if (currentChapterIndex === -1) return;
        
        const content = editor.getHTML();
        const currentChapter = currentChapters[currentChapterIndex];
        const newManuscript = { ...projectDataRef.current.manuscript };
        newManuscript.chapters[currentChapterIndex] = { 
          ...currentChapter, 
          content, 
          title: localTitleRef.current 
        };
        setProjectData({ ...projectDataRef.current, manuscript: newManuscript });
        sessionStorage.removeItem('hasUnsavedChanges');
      }
    };
  }, [chapter?.id, editor, autoSaveEnabled, saveStatus, setProjectData]);

  // Handle warning modal actions
  const handleSaveAndSwitch = () => {
    if (editor) {
      saveChapter(editor.getHTML(), localTitle);
      setSaveStatus('Saved');
      sessionStorage.removeItem('hasUnsavedChanges');
      setShowUnsavedWarning(false);
      
      // Check if navigating to lore or switching chapters
      if (window.pendingLoreNavigation) {
        const loreId = window.pendingLoreNavigation;
        window.pendingLoreNavigation = null;
        window.dispatchEvent(new CustomEvent('force-save-all'));
        navigate(`/lore?id=${loreId}`);
      } else if (pendingChapterId) {
        // Force chapter reload
        const newChapter = projectDataRef.current.manuscript.chapters.find(ch => ch.id === pendingChapterId);
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
    setSaveStatus('Saved');
    
    // Check if navigating to lore or switching chapters
    if (window.pendingLoreNavigation) {
      const loreId = window.pendingLoreNavigation;
      window.pendingLoreNavigation = null;
      window.dispatchEvent(new CustomEvent('force-save-all'));
      navigate(`/lore?id=${loreId}`);
    } else if (pendingChapterId && editor) {
      // Force chapter reload
      const newChapter = projectDataRef.current.manuscript.chapters.find(ch => ch.id === pendingChapterId);
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

  // Autosave effect - only trigger on saveStatus changes, not chapter changes
  useEffect(() => {
    if (!editor || !autoSaveEnabled) return;
    if (saveStatus !== 'Unsaved changes...') return;
    
    const saveTimer = setTimeout(() => {
      // Get the current chapter index at save time
      const currentChapters = chaptersRef.current;
      const currentChapterIndex = currentChapters.findIndex(c => c.id === editor.storage?.currentChapterId);
      if (currentChapterIndex === -1) return;
      
      const currentChapter = currentChapters[currentChapterIndex];
      const content = editor.getHTML();
      
      // Save with current data, not stale closure data
      const newManuscript = { ...projectDataRef.current.manuscript };
      newManuscript.chapters[currentChapterIndex] = { 
        ...currentChapter, 
        content, 
        title: localTitleRef.current 
      };
      setProjectData({ ...projectDataRef.current, manuscript: newManuscript });
      setSaveStatus('Saved');
      sessionStorage.setItem('hasUnsavedChanges', 'false');
    }, 2000); // Save 2 seconds after last change
    
    return () => clearTimeout(saveTimer);
  }, [saveStatus, autoSaveEnabled, editor, setProjectData, setSaveStatus]);

  const saveChapter = useCallback((newContent, newTitle) => {
    // Always get fresh chapter index to avoid stale closures
    const currentChapters = chaptersRef.current;
    const currentChapterIndex = currentChapters.findIndex(c => c.id === editor?.storage?.currentChapterId);
    if (currentChapterIndex === -1) return;
    
    const currentChapter = currentChapters[currentChapterIndex];
    const newManuscript = { ...projectDataRef.current.manuscript };
    newManuscript.chapters[currentChapterIndex] = { 
      ...currentChapter, 
      content: newContent, 
      title: newTitle 
    };
    setProjectData({ ...projectDataRef.current, manuscript: newManuscript });
  }, [editor, setProjectData]);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    setSaveStatus('Unsaved changes...');
    sessionStorage.setItem('hasUnsavedChanges', 'true');
    
    if (titleSaveTimer.current) {
      clearTimeout(titleSaveTimer.current);
    }
    
    if (autoSaveEnabled) {
      titleSaveTimer.current = setTimeout(() => {
        // Use fresh chapter data at save time
        const currentChapterIndex = chapters.findIndex(c => c.id === editor?.storage?.currentChapterId);
        if (currentChapterIndex !== -1) {
          const currentChapter = chapters[currentChapterIndex];
          const newManuscript = { ...projectData.manuscript };
          newManuscript.chapters[currentChapterIndex] = { 
            ...currentChapter, 
            content: editor?.getHTML() || currentChapter.content, 
            title: newTitle 
          };
          setProjectData({ ...projectData, manuscript: newManuscript });
          setSaveStatus('Saved');
          sessionStorage.setItem('hasUnsavedChanges', 'false');
        }
      }, 2000); // Save 2 seconds after title change
    }
  };

  const handleManualSave = () => {
    if (editor) {
      saveChapter(editor.getHTML(), localTitle);
      setSaveStatus('Saved');
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
    setSaveStatus('Links Updated!');
    setTimeout(() => setSaveStatus('Saved'), 2000);
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
  const handleContextMenu = async (e) => {
    // If we're using the native Electron menu, do not intercept right-click.
    if (useNativeContextMenu) {
      try {
        const clickedWord = getWordAtPosition(e);
        if (clickedWord?.text) {
          window.electronAPI?.reportContextWord?.({ word: clickedWord.text });
        }
      } catch {}
      return;
    }

    e.preventDefault();
    
    // Clear previous spell check data immediately
    window.spellCheckWord = null;
    pendingSpellcheckRef.current = null;
    
    // Show menu immediately (spell check will populate async)
    const menuPosition = { x: e.clientX, y: e.clientY };
    setContextMenu(menuPosition);
    contextMenuRef.current = menuPosition;
    
    // Get the clicked word and check if it's misspelled
    const clickedWord = getWordAtPosition(e);

    if (clickedWord) {
      pendingSpellcheckRef.current = {
        ...clickedWord,
        x: menuPosition.x,
        y: menuPosition.y,
        ts: Date.now(),
      };
    }
  };

  // Listen for spellcheck context payloads from the Electron main process.
  // This avoids racing renderer->main IPC calls against the internal spellcheck pipeline.
  useEffect(() => {
    if (!window.electronAPI?.onSpellCheckContext) return;

    const handler = (payload) => {
      const openMenu = contextMenuRef.current;
      const pending = pendingSpellcheckRef.current;
      if (!openMenu || !pending) return;

      // In packaged builds (and when the editor is CSS-transformed/zoomed), Electron's
      // context-menu coords may not match renderer `clientX/clientY`. Treat the next
      // incoming payload shortly after the right-click as authoritative.
      if (Date.now() - (pending.ts || 0) > 1500) return;

      const normalizeWord = (w) =>
        String(w || '')
          .trim()
          .toLowerCase()
          .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');

      const pendingWord = normalizeWord(pending.text);
      const reportedMisspelling = normalizeWord(payload?.misspelledWord);

      // If Electron reported a misspelling but it's clearly a different token, ignore.
      if (reportedMisspelling && pendingWord && reportedMisspelling !== pendingWord) return;

      // If Electron reports a misspelled word, attach suggestions to the doc range we computed.
      if (payload?.misspelledWord) {
        window.spellCheckWord = {
          word: payload.misspelledWord,
          from: pending.from,
          to: pending.to,
          suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
        };
      } else {
        window.spellCheckWord = null;
      }

      // Consume this pending click so later context-menu events don't overwrite it.
      pendingSpellcheckRef.current = null;

      // Force context menu re-render so `EditorContextMenu` re-reads `window.spellCheckWord`.
      setContextMenu((prev) => (prev ? { ...prev } : prev));
    };

    window.electronAPI.onSpellCheckContext(handler);
    return () => {
      window.electronAPI?.removeAllListeners?.('spellcheck-context');
    };
  }, []);
  
  // Helper function to get word at mouse position
  const getWordAtPosition = (e) => {
    if (!editor) return null;
    
    const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
    if (!pos) return null;
    
    const { doc } = editor.state;
    const resolvedPos = doc.resolve(pos.pos);
    const parent = resolvedPos.parent;
    
    // Check if parent node is a text block (paragraph, heading, etc.)
    if (parent.isTextblock && parent.textContent) {
      const text = parent.textContent;
      const offset = resolvedPos.parentOffset;
      
      // Find word boundaries
      let start = offset;
      let end = offset;
      
      // Go backwards to find start
      while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
      }
      
      // Go forwards to find end
      while (end < text.length && /\w/.test(text[end])) {
        end++;
      }
      
      // Must have found at least one character
      if (start === end) return null;
      
      const word = text.slice(start, end);
      
      // Calculate absolute positions in the document
      const nodeStart = resolvedPos.start();
      const absoluteStart = nodeStart + start;
      const absoluteEnd = nodeStart + end;
      
      return {
        text: word,
        from: absoluteStart,
        to: absoluteEnd
      };
    }
    
    return null;
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
          <span style={{ fontSize: '11px', color: saveStatus === 'Saved' ? 'var(--text-muted)' : 'var(--accent)' }}>{saveStatus}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* MAIN EDITOR WORKSPACE */}
        <div 
          id="editor-workspace" 
          style={workspaceStyle} 
          className={`${isTypewriterMode ? 'typewriter-active' : ''} ${isFocusMode ? 'focus-mode-active' : ''}`}
          onContextMenu={handleContextMenu} // Custom menu fallback (native menu in Electron)
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
      {!useNativeContextMenu && contextMenu && (
        <EditorContextMenu 
          editor={editor}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* NATIVE CONTEXT MENU -> LORE MODALS */}
      {nativeLoreAction?.mode === 'create' && (
        <CreateLoreModal
          selectedText={nativeLoreAction.text}
          suggestedType={detectLoreType(nativeLoreAction.text)}
          projectData={projectData}
          setProjectData={setProjectData}
          saveNowSilently={saveNowSilently}
          onClose={() => setNativeLoreAction(null)}
          editor={editor}
        />
      )}
      {nativeLoreAction?.mode === 'addTo' && (
        <AddToExistingModal
          selectedText={nativeLoreAction.text}
          projectData={projectData}
          setProjectData={setProjectData}
          saveNowSilently={saveNowSilently}
          onClose={() => setNativeLoreAction(null)}
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
