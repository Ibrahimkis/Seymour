import React, { useState, useEffect } from 'react';
import CustomModal from './CustomModal';
import { useProject } from '../context/ProjectContext';

const CompileModal = ({ isOpen, onClose }) => {
  const { projectData } = useProject();
  
  // --- STATE ---
  const [selectedIds, setSelectedIds] = useState([]); // IDs of chapters to export
  const [format, setFormat] = useState('html'); // html, doc, txt, md, pdf
  const [options, setOptions] = useState({
    includeTitles: true,
    pageBreaks: true,
  });
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Initialize selection when modal opens
  useEffect(() => {
    if (isOpen && projectData.manuscript.chapters) {
      // Default: Select ALL
      setSelectedIds(projectData.manuscript.chapters.map(c => c.id));
    }
  }, [isOpen, projectData]);

  // --- SELECTION HANDLERS ---
  const toggleChapter = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => setSelectedIds(projectData.manuscript.chapters.map(c => c.id));
  const selectNone = () => setSelectedIds([]);

  // --- CONTENT GENERATORS ---

  // 1. Helper: Strip HTML for TXT/MD
  const stripHtml = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // 2. Generator Logic
  const generateContent = () => {
    // Filter chapters based on selection
    // Note: We map using the original order to keep them sorted
    const chaptersToExport = projectData.manuscript.chapters.filter(c => selectedIds.includes(c.id));

    if (chaptersToExport.length === 0) return null;

    let content = "";

    // --- FORMAT: HTML / DOC / PDF ---
    if (['html', 'doc', 'pdf'].includes(format)) {
      content += `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${projectData.title || 'Export'}</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; color: black; background: white; }
            h1 { text-align: center; margin-top: 100px; margin-bottom: 50px; page-break-before: always; }
            p { margin-bottom: 1em; text-indent: 2em; }
            .page-break { page-break-after: always; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
      `;

      chaptersToExport.forEach((chap, index) => {
        if (options.pageBreaks && index > 0) content += `<div class="page-break"></div>`;
        if (options.includeTitles) content += `<h1>${chap.title}</h1>`;
        content += chap.content;
      });

      content += `</body></html>`;
    } 
    
    // --- FORMAT: TXT ---
    else if (format === 'txt') {
      chaptersToExport.forEach((chap, index) => {
        if (index > 0) content += `\n\n------------------------------------------------\n\n`;
        if (options.includeTitles) content += `${chap.title.toUpperCase()}\n\n`;
        // Convert HTML paragraphs to newlines
        let text = chap.content.replace(/<\/p>/g, '\n\n').replace(/<br>/g, '\n');
        content += stripHtml(text);
      });
    }

    // --- FORMAT: MARKDOWN (MD) ---
    else if (format === 'md') {
      chaptersToExport.forEach((chap, index) => {
        if (index > 0) content += `\n\n---\n\n`;
        if (options.includeTitles) content += `# ${chap.title}\n\n`;
        // Basic conversions
        let text = chap.content
          .replace(/<b>/g, '**').replace(/<\/b>/g, '**')
          .replace(/<i>/g, '*').replace(/<\/i>/g, '*')
          .replace(/<\/p>/g, '\n\n');
        content += stripHtml(text);
      });
    }

    return content;
  };

  // --- DOWNLOAD HANDLER ---
  const handleCompile = () => {
    const content = generateContent();
    if (!content) {
      setShowAlertModal(true);
      return;
    }

    // Handle PDF separately (Print Method)
    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      // Wait for images to load before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
      onClose();
      return;
    }

    // Handle File Downloads
    let mimeType = 'text/plain';
    let extension = 'txt';

    if (format === 'html') { mimeType = 'text/html'; extension = 'html'; }
    if (format === 'doc') { mimeType = 'application/msword'; extension = 'doc'; } // Trick Word into opening HTML
    if (format === 'md') { mimeType = 'text/markdown'; extension = 'md'; }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectData.title || 'Draft'}_Export.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>Compile Manuscript</div>
        
        <div style={bodyStyle}>
          
          <div style={{ display: 'flex', gap: '20px', height: '300px' }}>
            
            {/* LEFT: CHAPTER SELECTION */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', paddingRight: '15px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>SELECT CHAPTERS</div>
              
              <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '4px', padding: '5px' }}>
                {projectData.manuscript.chapters.map(chap => (
                  <label key={chap.id} style={itemRowStyle}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(chap.id)}
                      onChange={() => toggleChapter(chap.id)}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chap.title}</span>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={selectAll} style={miniBtnStyle}>All</button>
                <button onClick={selectNone} style={miniBtnStyle}>None</button>
              </div>
            </div>

            {/* RIGHT: OPTIONS */}
            <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div>
                <div style={labelStyle}>FORMAT</div>
                <select 
                  value={format} 
                  onChange={(e) => setFormat(e.target.value)}
                  style={selectStyle}
                >
                  <option value="html">HTML (Web Book)</option>
                  <option value="doc">DOC (Word)</option>
                  <option value="pdf">PDF (Print)</option>
                  <option value="txt">TXT (Plain Text)</option>
                  <option value="md">Markdown</option>
                </select>
              </div>

              <div>
                <div style={labelStyle}>OPTIONS</div>
                <label style={checkLabelStyle}>
                  <input type="checkbox" checked={options.includeTitles} onChange={(e) => setOptions({...options, includeTitles: e.target.checked})} />
                  Include Titles
                </label>
                {['html', 'doc', 'pdf'].includes(format) && (
                  <label style={checkLabelStyle}>
                    <input type="checkbox" checked={options.pageBreaks} onChange={(e) => setOptions({...options, pageBreaks: e.target.checked})} />
                    Page Breaks
                  </label>
                )}
              </div>

              <div style={{ marginTop: 'auto', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {format === 'doc' && "Note: Generates a Word-compatible file. Save as .docx inside Word."}
                {format === 'pdf' && "Note: Opens Print dialog. Choose 'Save as PDF'."}
              </div>

            </div>
          </div>

        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleCompile} style={compileBtnStyle}>
            Export {format.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Alert Modal */}
      <CustomModal
        isOpen={showAlertModal}
        type="alert"
        title="Selection Required"
        message="Please select at least one chapter to export."
        onConfirm={() => setShowAlertModal(false)}
      />
    </div>
  );
};

// --- STYLES ---
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' };
const modalStyle = { background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', width: '600px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' };
const headerStyle = { padding: '15px', borderBottom: '1px solid var(--border)', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px' };
const bodyStyle = { padding: '20px', color: 'var(--text-main)', fontSize: '13px' };
const footerStyle = { padding: '10px 15px', background: 'var(--bg-header)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' };

const itemRowStyle = { display: 'flex', alignItems: 'center', padding: '4px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const miniBtnStyle = { flex: 1, padding: '4px', background: 'var(--bg-header)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', borderRadius: '3px' };
const labelStyle = { fontWeight: 'bold', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' };
const selectStyle = { width: '100%', padding: '6px', background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px' };
const checkLabelStyle = { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' };

const btnBase = { padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', border: 'none' };
const cancelBtnStyle = { ...btnBase, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' };
const compileBtnStyle = { ...btnBase, background: 'var(--accent)', color: 'white', fontWeight: 'bold' };

export default CompileModal;