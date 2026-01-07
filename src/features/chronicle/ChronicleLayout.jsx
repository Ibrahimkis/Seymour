import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import CustomModal from '../../components/CustomModal';

const EVENT_TYPES = [
  { id: 'era', label: 'Era / Age', color: '#fff', border: '2px solid #fff' },
  { id: 'war', label: 'War / Conflict', color: '#e74c3c', border: '1px solid #e74c3c' },
  { id: 'pol', label: 'Political', color: '#f1c40f', border: '1px solid #f1c40f' },
  { id: 'bio', label: 'Life Event', color: '#3498db', border: '1px solid #3498db' },
  { id: 'lore', label: 'General Lore', color: '#9b59b6', border: '1px solid #9b59b6' },
];

const ChronicleLayout = () => {
  const { projectData, setProjectData } = useProject();
  
  // Ensure timeline array exists
  const events = projectData.timeline || [];

  // --- STATE ---
  const [modal, setModal] = useState({ isOpen: false, type: 'input', title: '', onConfirm: () => {} });
  
  // Form State for creating/editing
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ year: 0, displayDate: '', title: '', desc: '', type: 'lore' });

  // Listen for force save events
  useEffect(() => {
    const handleForceSave = () => {
      // Force a data change to trigger save - use callback
      setProjectData(prev => {
        const currentEvents = prev.timeline || [];
        return { ...prev, timeline: [...currentEvents] };
      });
    };

    window.addEventListener('force-save-all', handleForceSave);
    return () => window.removeEventListener('force-save-all', handleForceSave);
  }, [setProjectData]);

  // --- ACTIONS ---
  const closeModal = () => setModal({ ...modal, isOpen: false });

  const handleSave = () => {
    let newEvents;
    const payload = {
      id: editId || Date.now(),
      year: parseInt(formData.year) || 0, // Used for sorting
      displayDate: formData.displayDate,   // What is shown (e.g. "4th Age, Year 92")
      title: formData.title,
      desc: formData.desc,
      type: formData.type
    };

    if (editId) {
      // Update existing
      newEvents = events.map(ev => ev.id === editId ? payload : ev);
    } else {
      // Create new
      newEvents = [...events, payload];
    }

    // Sort by Year
    newEvents.sort((a, b) => a.year - b.year);

    setProjectData({ ...projectData, timeline: newEvents });
    resetForm();
  };

  const deleteEvent = (id) => {
    setModal({
      isOpen: true, type: 'confirm', title: 'Delete Event', message: 'Remove this event from history?',
      onConfirm: () => {
        const newEvents = events.filter(e => e.id !== id);
        setProjectData({ ...projectData, timeline: newEvents });
        closeModal();
      }
    });
  };

  const editEvent = (ev) => {
    setFormData({ year: ev.year, displayDate: ev.displayDate, title: ev.title, desc: ev.desc, type: ev.type });
    setEditId(ev.id);
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({ year: 0, displayDate: '', title: '', desc: '', type: 'lore' });
    setEditId(null);
    setIsEditing(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      <CustomModal isOpen={modal.isOpen} type={modal.type} title={modal.title} message={modal.message} onConfirm={modal.onConfirm} onCancel={closeModal} />

      {/* HEADER */}
      <div style={headerStyle}>
        <h2 style={{ margin: 0, color: 'var(--text-main)' }}>⏳ The Chronicle</h2>
        <button onClick={() => setIsEditing(true)} style={addBtnStyle}>+ Add Event</button>
      </div>

      {/* CONTENT AREA */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT: TIMELINE VIEW */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px', position: 'relative' }}>
          
          {/* Central Line */}
          <div style={lineStyle}></div>

          {events.length === 0 && <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>No history recorded yet.</div>}

          {events.map((ev, index) => {
            const tag = EVENT_TYPES.find(t => t.id === ev.type) || EVENT_TYPES[4];
            const isLeft = index % 2 === 0; // Alternate sides

            return (
              <div key={ev.id} style={{ ...rowStyle, flexDirection: isLeft ? 'row' : 'row-reverse' }}>
                
                {/* CONTENT CARD */}
                <div style={cardWrapperStyle}>
                  <div style={{ ...cardStyle, borderLeft: isLeft ? `4px solid ${tag.color}` : 'none', borderRight: !isLeft ? `4px solid ${tag.color}` : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: tag.color, textTransform: 'uppercase' }}>{ev.displayDate || ev.year}</span>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => editEvent(ev)} style={iconBtn}>✎</button>
                        <button onClick={() => deleteEvent(ev.id)} style={{...iconBtn, color: 'red'}}>×</button>
                      </div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '5px' }}>{ev.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{ev.desc}</div>
                  </div>
                </div>

                {/* DOT ON LINE */}
                <div style={{ ...dotStyle, background: tag.color, boxShadow: `0 0 10px ${tag.color}` }}></div>
                
                {/* EMPTY SPACE FOR OPPOSITE SIDE */}
                <div style={{ flex: 1 }}></div>

              </div>
            );
          })}
        </div>

        {/* RIGHT: EDITOR PANEL (Slides in when editing) */}
        {isEditing && (
          <div style={editorPanelStyle}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-main)' }}>
              {editId ? 'Edit Event' : 'New Event'}
            </div>

            <label style={labelStyle}>Sort Order (Numeric Year)</label>
            <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} style={inputStyle} />

            <label style={labelStyle}>Display Date (e.g. "4th Age, 202")</label>
            <input type="text" value={formData.displayDate} onChange={e => setFormData({...formData, displayDate: e.target.value})} style={inputStyle} />

            <label style={labelStyle}>Event Type</label>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap' }}>
              {EVENT_TYPES.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => setFormData({...formData, type: t.id})}
                  style={{ 
                    ...tagStyle, 
                    borderColor: t.color, 
                    background: formData.type === t.id ? t.color : 'transparent',
                    color: formData.type === t.id ? '#000' : t.color
                  }}
                >
                  {t.label}
                </div>
              ))}
            </div>

            <label style={labelStyle}>Title</label>
            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={inputStyle} />

            <label style={labelStyle}>Description</label>
            <textarea value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} style={{...inputStyle, height: '100px', resize: 'none'}} />

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleSave} style={saveBtnStyle}>Save Event</button>
              <button onClick={resetForm} style={cancelBtnStyle}>Cancel</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// --- STYLES ---
const headerStyle = { padding: '20px 40px', borderBottom: '1px solid var(--border)', background: 'var(--bg-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const addBtnStyle = { background: 'var(--accent)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };

// TIMELINE STYLES
const lineStyle = { position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: 'var(--border)', transform: 'translateX(-50%)' };
const rowStyle = { display: 'flex', alignItems: 'center', marginBottom: '40px', position: 'relative', zIndex: 2 };
const cardWrapperStyle = { flex: 1, display: 'flex', justifyContent: 'center' }; // Centers card in its half
const cardStyle = { width: '80%', background: 'var(--bg-panel)', padding: '15px', borderRadius: '6px', border: '1px solid var(--border)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' };
const dotStyle = { width: '16px', height: '16px', borderRadius: '50%', border: '3px solid var(--bg-app)', position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 10 };
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' };

// EDITOR FORM STYLES
const editorPanelStyle = { width: '350px', background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)', padding: '20px', display: 'flex', flexDirection: 'column' };
const labelStyle = { fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px', fontWeight: 'bold', textTransform: 'uppercase' };
const inputStyle = { width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px', marginBottom: '15px', outline: 'none' };
const tagStyle = { padding: '4px 8px', borderRadius: '12px', border: '1px solid', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' };
const saveBtnStyle = { flex: 1, background: 'var(--accent)', border: 'none', color: 'white', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const cancelBtnStyle = { flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '10px', borderRadius: '4px', cursor: 'pointer' };

export default ChronicleLayout;