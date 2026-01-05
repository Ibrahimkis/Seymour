import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';

const ExportLoreModal = ({ isOpen, onClose }) => {
  const { projectData } = useProject();

  // --- STATE ---
  const [selectedIds, setSelectedIds] = useState([]); // IDs of lore cards to export
  const [format, setFormat] = useState('json'); // json, html, txt, md
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Initialize selection when modal opens
  useEffect(() => {
    if (isOpen && projectData.lore.characters) {
      // Default: Select ALL
      setSelectedIds(projectData.lore.characters.map(c => c.id));
    }
  }, [isOpen, projectData]);

  // --- SELECTION HANDLERS ---
  const toggleCard = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => setSelectedIds(projectData.lore.characters.map(c => c.id));
  const selectNone = () => setSelectedIds([]);

  // --- CONTENT GENERATORS ---

  // 1. Helper: Strip HTML for TXT/MD
  const stripHtml = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // 2. Get biography content from a lore card
  const getBiography = (card) => {
    // Priority: The dedicated biography field
    if (card.biography && card.biography.trim().length > 0) {
      return card.biography;
    }

    // Legacy fallback: Look inside sections
    if (!card.sections || card.sections.length === 0) return '';
    for (let s of card.sections) {
      for (let b of s.blocks) {
        if (['summary', 'description', 'biography'].includes(b.label.toLowerCase()) && b.content) {
          return b.content;
        }
      }
    }
    return '';
  };

  // 3. Generate content based on format
  const generateContent = () => {
    const cardsToExport = projectData.lore.characters.filter(c => selectedIds.includes(c.id));

    switch (format) {
      case 'json':
        return JSON.stringify(cardsToExport, null, 2);

      case 'html':
        let html = `<html><head><title>${projectData.title || 'Project'} - Lore Cards</title></head><body>`;
        html += `<h1>${projectData.title || 'Project'} - Lore Cards</h1>`;
        cardsToExport.forEach(card => {
          html += `<div style="margin-bottom: 30px; border: 1px solid #ccc; padding: 20px;">`;
          html += `<h2>${card.name || 'Unnamed'}</h2>`;
          if (card.aliases && card.aliases.length > 0) {
            html += `<p><strong>Aliases:</strong> ${card.aliases.join(', ')}</p>`;
          }
          html += `<p><strong>Type:</strong> ${card.type || 'Unknown'}</p>`;
          const bio = getBiography(card);
          if (bio) {
            html += `<div><strong>Biography:</strong><br>${bio}</div>`;
          }
          html += `</div>`;
        });
        html += `</body></html>`;
        return html;

      case 'txt':
        let txt = `${projectData.title || 'Project'} - Lore Cards\n\n`;
        cardsToExport.forEach((card, index) => {
          txt += `${index + 1}. ${card.name || 'Unnamed'}\n`;
          if (card.aliases && card.aliases.length > 0) {
            txt += `   Aliases: ${card.aliases.join(', ')}\n`;
          }
          txt += `   Type: ${card.type || 'Unknown'}\n`;
          const bio = stripHtml(getBiography(card));
          if (bio) {
            txt += `   Biography: ${bio}\n`;
          }
          txt += `\n`;
        });
        return txt;

      case 'md':
        let md = `# ${projectData.title || 'Project'} - Lore Cards\n\n`;
        cardsToExport.forEach(card => {
          md += `## ${card.name || 'Unnamed'}\n\n`;
          if (card.aliases && card.aliases.length > 0) {
            md += `**Aliases:** ${card.aliases.join(', ')}\n\n`;
          }
          md += `**Type:** ${card.type || 'Unknown'}\n\n`;
          const bio = stripHtml(getBiography(card));
          if (bio) {
            md += `**Biography:**\n${bio}\n\n`;
          }
          md += `---\n\n`;
        });
        return md;

      default:
        return JSON.stringify(cardsToExport, null, 2);
    }
  };

  // --- EXPORT HANDLER ---
  const handleExport = () => {
    if (selectedIds.length === 0) {
      setShowAlertModal(true);
      return;
    }

    const content = generateContent();
    const filename = `${projectData.title || 'project'}_lore_cards_${new Date().toISOString().slice(0, 10)}`;

    // Create and download the file
    const mimeTypes = {
      json: 'application/json',
      html: 'text/html',
      txt: 'text/plain',
      md: 'text/markdown'
    };

    const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={headerStyle}>Export Lore Cards</div>

          <div style={bodyStyle}>
            {/* FORMAT SELECTION */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Export Format:
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  width: '200px'
                }}
              >
                <option value="json">JSON</option>
                <option value="html">HTML</option>
                <option value="txt">Plain Text</option>
                <option value="md">Markdown</option>
              </select>
            </div>

            {/* CARD SELECTION */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button onClick={selectAll} style={{ padding: '5px 10px', fontSize: '12px' }}>
                  Select All
                </button>
                <button onClick={selectNone} style={{ padding: '5px 10px', fontSize: '12px' }}>
                  Select None
                </button>
              </div>

              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '10px'
              }}>
                {projectData.lore.characters.map(card => (
                  <label key={card.id} style={{
                    display: 'block',
                    padding: '5px',
                    marginBottom: '5px',
                    background: selectedIds.includes(card.id) ? 'rgba(0,123,255,0.1)' : 'transparent',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(card.id)}
                      onChange={() => toggleCard(card.id)}
                      style={{ marginRight: '8px' }}
                    />
                    {card.name || 'Unnamed'} ({card.type || 'Unknown'})
                  </label>
                ))}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={onClose} style={{ padding: '10px 20px' }}>
                Cancel
              </button>
              <button
                onClick={handleExport}
                style={{
                  padding: '10px 20px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Export {selectedIds.length} Card{selectedIds.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ALERT MODAL */}
      {showAlertModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={headerStyle}>No Cards Selected</div>
            <div style={bodyStyle}>
              <p>Please select at least one lore card to export.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setShowAlertModal(false)} style={{ padding: '10px 20px' }}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportLoreModal;

// --- STYLES ---
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' };
const modalStyle = { background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', width: '600px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' };
const headerStyle = { padding: '15px', borderBottom: '1px solid var(--border)', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px' };
const bodyStyle = { padding: '20px', color: 'var(--text-main)', fontSize: '13px' };