import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import CustomModal from '../../components/CustomModal'; // <--- Import your Modal

const TypographyControls = () => {
  const { projectData, setProjectData } = useProject();
  
  // --- MODAL STATE ---
  const [modal, setModal] = useState({ 
    isOpen: false, 
    type: 'alert', 
    title: '', 
    message: '', 
    onConfirm: () => {} 
  });

  const closeModal = () => setModal({ ...modal, isOpen: false });

  // Safety check: ensure settings object exists
  const settings = projectData.settings || { 
    fontSize: 18, 
    zoom: 100, 
    fontFamily: 'serif', 
    customFonts: [] 
  };

  // Helper to update a single setting safely
  const updateSetting = (key, value) => {
    setProjectData(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  };

  const handleFontUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // Clean up the file name to be a valid CSS font family name
      const fontName = file.name.split('.')[0].replace(/\s+/g, '-');
      const fontData = event.target.result;

      try {
        // 1. Register font with the browser immediately so we can see it
        const newFont = new FontFace(fontName, `url(${fontData})`);
        newFont.load().then((loadedFont) => {
          document.fonts.add(loadedFont);
          
          // 2. Save to Project Data (Atomic Update)
          setProjectData(prev => {
            const currentSettings = prev.settings || {};
            const currentFonts = currentSettings.customFonts || [];
            
            return {
              ...prev,
              settings: {
                ...currentSettings,
                // Add new font to list
                customFonts: [...currentFonts, { name: fontName, data: fontData }],
                // auto-select the new font
                fontFamily: fontName 
              }
            };
          });
          
          // --- SUCCESS MODAL ---
          setModal({
            isOpen: true,
            type: 'alert',
            title: 'Font Added',
            message: `Successfully installed "${fontName}". It is now selected.`,
            onConfirm: closeModal
          });

        }).catch(err => {
          throw err;
        });
      } catch (err) {
        console.error("Font loading failed:", err);
        // --- ERROR MODAL ---
        setModal({
          isOpen: true,
          type: 'alert',
          title: 'Upload Failed',
          message: 'Failed to load font. Make sure it is a valid TTF or OTF file.',
          onConfirm: closeModal
        });
      }
    };
    reader.readAsDataURL(file);
    // Clear input so you can upload the same file again if needed
    e.target.value = null; 
  };

  return (
    <>
      {/* RENDER MODAL */}
      <CustomModal 
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={() => { modal.onConfirm && modal.onConfirm(); closeModal(); }}
        onCancel={closeModal}
      />

      <div style={containerStyle}>
        {/* FONT FAMILY SELECTOR */}
        <select 
          value={settings.fontFamily} 
          onChange={(e) => updateSetting('fontFamily', e.target.value)}
          style={selectStyle}
          title="Select Font"
        >
          <optgroup label="System">
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans</option>
            <option value="'Courier New', monospace">Mono</option>
            <option value="'Georgia', serif">Georgia</option>
            <option value="'Palatino Linotype', serif">Palatino</option>
          </optgroup>
          
          {/* RENDER CUSTOM FONTS HERE */}
          {settings.customFonts && settings.customFonts.length > 0 && (
            <optgroup label="My Fonts">
              {settings.customFonts.map((f, index) => (
                <option key={`${f.name}-${index}`} value={f.name}>
                  {f.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* FONT SIZE */}
        <div style={groupStyle}>
          <button onClick={() => updateSetting('fontSize', Math.max(10, settings.fontSize - 1))} style={miniBtn} title="Decrease Size">-</button>
          <span style={valStyle}>{settings.fontSize}</span>
          <button onClick={() => updateSetting('fontSize', Math.min(72, settings.fontSize + 1))} style={miniBtn} title="Increase Size">+</button>
        </div>

        {/* ZOOM */}
        <div style={groupStyle}>
          <span style={labelStyle}>Z</span>
          <button onClick={() => updateSetting('zoom', Math.max(50, settings.zoom - 10))} style={miniBtn} title="Zoom Out">-</button>
          <span style={valStyle}>{settings.zoom}%</span>
          <button onClick={() => updateSetting('zoom', Math.min(200, settings.zoom + 10))} style={miniBtn} title="Zoom In">+</button>
        </div>

        {/* UPLOAD BUTTON */}
        <label style={uploadBtnStyle} title="Upload Custom Font (TTF/OTF)">
          ➕ Font
          <input type="file" accept=".ttf,.otf" onChange={handleFontUpload} style={{ display: 'none' }} />
        </label>
      </div>
    </>
  );
};

// --- STYLES ---
const containerStyle = { display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #444', paddingLeft: '8px' };
const selectStyle = { background: '#111', color: '#ccc', border: '1px solid #444', borderRadius: '4px', fontSize: '11px', padding: '2px', maxWidth: '100px' };
const groupStyle = { display: 'flex', alignItems: 'center', background: '#222', borderRadius: '4px', border: '1px solid #333', padding: '0 4px' };
const miniBtn = { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold', padding: '0 4px', fontSize: '14px' };
const valStyle = { fontSize: '10px', width: '25px', textAlign: 'center', color: '#888' };
const labelStyle = { fontSize: '9px', color: '#555', fontWeight: 'bold', marginRight: '2px' };
const uploadBtnStyle = { fontSize: '10px', background: '#333', padding: '3px 6px', borderRadius: '3px', cursor: 'pointer', color: '#ccc', whiteSpace: 'nowrap' };

export default TypographyControls;