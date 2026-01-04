import React from 'react';

const EditorToolbar = ({ editor }) => {
  if (!editor) return null;

  // Helper to add image via URL prompt (drag & drop also works)
  const addImage = () => {
    const url = window.prompt('Enter Image URL:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const setLink = () => {
    const url = window.prompt('Enter Link URL:');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  // Button Component for consistency
  const Btn = ({ onClick, isActive, children, title }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: isActive ? 'var(--bg-app)' : 'transparent',
        border: 'none',
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        cursor: 'pointer',
        padding: '3px 5px', // Reduced padding
        borderRadius: '3px',
        fontWeight: 'bold',
        fontSize: '12px', // Slightly smaller text/icon
        minWidth: '22px', // Tighter minimum width
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      className="toolbar-btn"
    >
      {children}
    </button>
  );

  const Divider = () => <div style={{width: '1px', height: '16px', background: '#444', margin: '0 4px'}}></div>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1px', padding: '0 5px', flexWrap: 'wrap' }}>
      
      {/* HISTORY */}
      <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo">↺</Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo">↻</Btn>
      
      <Divider />

      {/* TEXT FORMATTING */}
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">B</Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">I</Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">U</Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">S</Btn>
      
      <Divider />

      {/* HEADINGS */}
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">H1</Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">H2</Btn>
      <Btn onClick={() => editor.chain().focus().setParagraph().run()} isActive={editor.isActive('paragraph')} title="Paragraph">¶</Btn>

      <Divider />

      {/* ALIGNMENT */}
      <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">L</Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">C</Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">R</Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Justify">J</Btn>

      <Divider />

      {/* LISTS & QUOTES */}
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">•</Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List">1.</Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">”</Btn>

      <Divider />

      {/* MEDIA */}
      <Btn onClick={addImage} title="Insert Image">🖼️</Btn>
      <Btn onClick={setLink} isActive={editor.isActive('link')} title="Add Link">🔗</Btn>
      <Btn onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Clear Formatting">✕</Btn>

      {/* HOVER CSS */}
      <style>{`
        .toolbar-btn:hover { background-color: rgba(255,255,255,0.1) !important; color: var(--text-main) !important; }
      `}</style>
    </div>
  );
};

export default EditorToolbar;