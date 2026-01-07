import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import CustomModal from '../../components/CustomModal';

const RelationshipWeb = () => {
  const { projectData, setProjectData } = useProject();
  
  // --- 1. DATA MIGRATION & INITIALIZATION (FIXED) ---
  const rawData = projectData?.relationships;

  let graphs = [];

  // Logic: Ensure we always have an array with at least one graph
  if (Array.isArray(rawData) && rawData.length > 0) {
    graphs = rawData;
  } else if (rawData && !Array.isArray(rawData) && (rawData.nodes || rawData.edges)) {
    // Convert old single-object format to array format
    graphs = [{ id: 'default', name: 'Main Web', nodes: rawData.nodes || [], edges: rawData.edges || [] }];
  } else {
    // Default fallback if empty or null (Prevents the crash)
    graphs = [{ id: 'default', name: 'Main Web', nodes: [], edges: [] }];
  }

  // --- STATE ---
  // Fix: Ensure graphs[0] exists before accessing .id
  const [activeGraphId, setActiveGraphId] = useState(graphs[0]?.id || 'default');
  
  const currentGraph = graphs.find(g => g.id === activeGraphId) || graphs[0];
  const activeNodes = currentGraph?.nodes || [];
  const activeEdges = currentGraph?.edges || [];

  // Canvas State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState(null); 
  const [connectMode, setConnectMode] = useState(false);
  const [connectionStart, setConnectionStart] = useState(null); 

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, type: 'input', title: '', onConfirm: () => {} });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  // Listen for force save events
  useEffect(() => {
    const handleForceSave = () => {
      // Force a data change to trigger save - use callback
      setProjectData(prev => {
        const rawData = prev?.relationships;
        let currentGraphs = [];
        if (Array.isArray(rawData) && rawData.length > 0) {
          currentGraphs = rawData;
        } else if (rawData && !Array.isArray(rawData) && (rawData.nodes || rawData.edges)) {
          currentGraphs = [{ id: 'default', name: 'Main Graph', nodes: rawData.nodes || [], edges: rawData.edges || [] }];
        } else {
          currentGraphs = [{ id: 'default', name: 'Main Graph', nodes: [], edges: [] }];
        }
        return { ...prev, relationships: [...currentGraphs] };
      });
    };

    window.addEventListener('force-save-all', handleForceSave);
    return () => window.removeEventListener('force-save-all', handleForceSave);
  }, [setProjectData]);

  // --- HELPER: UPDATE SPECIFIC GRAPH ---
  const updateCurrentGraph = (updates) => {
    const newGraphs = graphs.map(g => 
      g.id === activeGraphId ? { ...g, ...updates } : g
    );
    setProjectData(prev => ({ ...prev, relationships: newGraphs }));
  };

  // --- TAB MANAGEMENT ---
  const createNewTab = () => {
    setModal({
      isOpen: true, type: 'input', title: 'New Web Name', message: 'e.g. "Leon\'s Relations"',
      onConfirm: (name) => {
        const newGraph = { id: Date.now(), name: name || 'Untitled Web', nodes: [], edges: [] };
        setProjectData(prev => ({ 
          ...prev, 
          relationships: [...graphs, newGraph] 
        }));
        setActiveGraphId(newGraph.id);
        setPan({ x: 0, y: 0 }); setScale(1); 
        closeModal();
      }
    });
  };

  const renameTab = (graphId) => {
    const graph = graphs.find(g => g.id === graphId);
    setModal({
      isOpen: true, type: 'input', title: 'Rename Web', message: 'Enter new name:',
      onConfirm: (name) => {
        if (!name) return closeModal();
        const newGraphs = graphs.map(g => g.id === graphId ? { ...g, name } : g);
        setProjectData(prev => ({ ...prev, relationships: newGraphs }));
        closeModal();
      }
    });
  };

  const deleteTab = (graphId, e) => {
    e.stopPropagation();
    if (graphs.length === 1) {
      setModal({
        isOpen: true,
        type: 'confirm',
        title: 'Cannot Delete',
        message: 'Cannot delete the last tab.',
        onConfirm: closeModal
      });
      return;
    }
    setModal({
      isOpen: true, type: 'confirm', title: 'Delete Web', message: 'Are you sure? This cannot be undone.',
      onConfirm: () => {
        const newGraphs = graphs.filter(g => g.id !== graphId);
        setProjectData(prev => ({ ...prev, relationships: newGraphs }));
        setActiveGraphId(newGraphs[0].id);
        closeModal();
      }
    });
  };

  // --- CANVAS LOGIC ---
  const handleWheel = (e) => {
    if (e.target.closest('.node-card')) return;
    const newScale = Math.min(Math.max(0.5, scale - e.deltaY * 0.001), 2);
    setScale(newScale);
  };

  const startPan = (e) => {
    if (e.target.closest('.node-card') || e.target.closest('button')) return;
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const doPan = (e) => {
    if (isDraggingCanvas) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (draggedNode) {
      const deltaX = (e.clientX - draggedNode.mouseX) / scale;
      const deltaY = (e.clientY - draggedNode.mouseY) / scale;
      const newNodes = activeNodes.map(n => 
        n.id === draggedNode.id 
          ? { ...n, x: draggedNode.startX + deltaX, y: draggedNode.startY + deltaY } 
          : n
      );
      updateCurrentGraph({ nodes: newNodes });
    }
  };

  const endPan = () => { setIsDraggingCanvas(false); setDraggedNode(null); };

  const addNodeToBoard = (charId) => {
    if (activeNodes.find(n => n.id === charId)) return;
    const newNode = { id: charId, x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 };
    updateCurrentGraph({ nodes: [...activeNodes, newNode] });
  };

  const removeNode = (nodeId) => {
    setModal({
      isOpen: true, type: 'confirm', title: 'Remove Character', message: 'Remove from this web?',
      onConfirm: () => {
        updateCurrentGraph({
          nodes: activeNodes.filter(n => n.id !== nodeId),
          edges: activeEdges.filter(e => e.source !== nodeId && e.target !== nodeId)
        });
        closeModal();
      }
    });
  };

  const startDragNode = (e, nodeId, x, y) => {
    if (connectMode) { handleConnectionClick(nodeId); return; }
    if (e.target.closest('.node-delete')) return;
    e.stopPropagation();
    setDraggedNode({ id: nodeId, startX: x, startY: y, mouseX: e.clientX, mouseY: e.clientY });
  };

  const handleConnectionClick = (nodeId) => {
    if (!connectionStart) {
      setConnectionStart(nodeId);
    } else {
      if (connectionStart === nodeId) { setConnectionStart(null); return; }
      setModal({
        isOpen: true, type: 'input', title: 'Relationship Label',
        onConfirm: (label) => {
          const newEdge = { id: Date.now(), source: connectionStart, target: nodeId, label: label || '' };
          updateCurrentGraph({ edges: [...activeEdges, newEdge] });
          setConnectionStart(null); setConnectMode(false); closeModal();
        }
      });
    }
  };

  const deleteEdge = (edgeId) => {
    setModal({
      isOpen: true, type: 'confirm', title: 'Delete Connection', message: 'Delete line?',
      onConfirm: () => {
        updateCurrentGraph({ edges: activeEdges.filter(e => e.id !== edgeId) });
        closeModal();
      }
    });
  };

  // --- RENDER HELPERS ---
  const characters = projectData?.lore?.characters || []; // Safety check
  
  const getUnplacedCharacters = () => {
    const placedIds = new Set(activeNodes.map(n => n.id));
    return characters.filter(c => !placedIds.has(c.id));
  };

  const getNodeCenter = (nodeId) => {
    const node = activeNodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 60, y: node.y + 30 }; 
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111' }}>
      <CustomModal isOpen={modal.isOpen} type={modal.type} title={modal.title} message={modal.message} onConfirm={modal.onConfirm} onCancel={closeModal} />

      {/* --- TAB BAR --- */}
      <div style={tabBarStyle}>
        <div style={{ display: 'flex', gap: '2px', overflowX: 'auto', flex: 1 }} className="custom-scrollbar">
          {graphs.map(graph => (
            <div 
              key={graph.id}
              onClick={() => { setActiveGraphId(graph.id); setPan({x:0, y:0}); setScale(1); }}
              onDoubleClick={() => renameTab(graph.id)}
              style={{
                ...tabStyle,
                background: activeGraphId === graph.id ? 'var(--bg-app)' : 'var(--bg-panel)',
                borderBottom: activeGraphId === graph.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeGraphId === graph.id ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              {graph.name}
              {graphs.length > 1 && (
                <span onClick={(e) => deleteTab(graph.id, e)} style={closeTabStyle}>×</span>
              )}
            </div>
          ))}
        </div>
        
        {/* NEW BUTTON */}
        <button onClick={createNewTab} style={newTabBtnStyle}>
          + New Web
        </button>
      </div>

      {/* --- MAIN CONTENT ROW --- */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* SIDEBAR */}
        <div style={sidebarStyle}>
          <div style={{fontWeight:'bold', paddingBottom: '10px', borderBottom:'1px solid var(--border)', marginBottom:'10px', color:'var(--accent)', fontSize: '11px', letterSpacing: '1px'}}>
            UNPLACED CHARACTERS
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
            {getUnplacedCharacters().map(char => (
              <div key={char.id} style={sidebarItemStyle}>
                <span>{char.name}</span>
                <button onClick={() => addNodeToBoard(char.id)} style={addBtn}>+</button>
              </div>
            ))}
            {getUnplacedCharacters().length === 0 && <div style={{color:'#555', fontSize:'12px', fontStyle:'italic'}}>All characters placed.</div>}
          </div>
        </div>

        {/* CANVAS */}
        <div 
          style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: isDraggingCanvas ? 'grabbing' : 'default', background: '#0a0a0a' }}
          onMouseDown={startPan} onMouseMove={doPan} onMouseUp={endPan} onMouseLeave={endPan} onWheel={handleWheel}
        >
          {/* CANVAS TOOLBAR */}
          <div style={toolbarStyle}>
            <button 
              onClick={() => { setConnectMode(!connectMode); setConnectionStart(null); }} 
              style={{ ...toolBtn, background: connectMode ? 'var(--accent)' : '#333', color: connectMode ? 'white' : '#ccc' }}
            >
              {connectMode ? (connectionStart ? 'Select Target...' : 'Select Source...') : '🔗 Connect'}
            </button>
            <button onClick={() => { setPan({x:0,y:0}); setScale(1); }} style={toolBtn}>Reset View</button>
          </div>

          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', width: '100%', height: '100%', position: 'absolute' }}>
            
            {/* SVG LINES */}
            <svg style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}>
              <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#555" /></marker></defs>
              {activeEdges.map(edge => {
                const start = getNodeCenter(edge.source);
                const end = getNodeCenter(edge.target);
                // Safety check if node was deleted but edge remains
                if (start.x === 0 || end.x === 0) return null; 
                
                return (
                  <g key={edge.id} pointerEvents="auto" onClick={() => deleteEdge(edge.id)} style={{cursor: 'pointer'}}>
                    <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#555" strokeWidth="2" markerEnd="url(#arrowhead)" />
                    <rect x={(start.x+end.x)/2 - 20} y={(start.y+end.y)/2 - 10} width="40" height="20" rx="4" fill="#000" />
                    <text x={(start.x+end.x)/2} y={(start.y+end.y)/2} dy="4" textAnchor="middle" fill="#ccc" fontSize="10" fontWeight="bold">{edge.label}</text>
                  </g>
                );
              })}
            </svg>

            {/* NODES */}
            {activeNodes.map(node => {
              const char = characters.find(c => c.id === node.id);
              if (!char) return null; // Safe check for ghost nodes
              
              const isSource = connectionStart === node.id;
              return (
                <div key={node.id} className="node-card" onMouseDown={(e) => startDragNode(e, node.id, node.x, node.y)}
                  style={{
                    position: 'absolute', left: node.x, top: node.y, width: '120px', height: '60px',
                    background: isSource ? 'var(--accent)' : 'var(--bg-panel)',
                    border: isSource ? '2px solid white' : '1px solid var(--border)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '5px', gap: '8px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)', cursor: connectMode ? 'crosshair' : 'grab', zIndex: 10
                  }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#000', overflow: 'hidden', flexShrink: 0, border: '1px solid #444' }}>
                    {char.imageSrc ? <img src={char.imageSrc} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} draggable={false}/> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: isSource ? 'white' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{char.name}</div>
                  </div>
                  <button className="node-delete" onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} style={deleteBadgeStyle}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <style>{` 
        .node-card:hover .node-delete { opacity: 1 !important; } 
        /* Custom Scrollbar for Sidebar */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: transparent; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
      `}</style>
    </div>
  );
};

// --- STYLES ---
const tabBarStyle = { height: '36px', background: 'var(--bg-header)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '5px' };
const tabStyle = { padding: '0 15px', height: '100%', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', borderRight: '1px solid var(--border)', position: 'relative', whiteSpace: 'nowrap' };
const closeTabStyle = { marginLeft: '8px', fontSize: '14px', color: '#666', cursor: 'pointer' };

const newTabBtnStyle = { 
  background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', 
  fontWeight: 'bold', cursor: 'pointer', padding: '0 10px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap'
};

const sidebarStyle = { width: '220px', background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '15px', zIndex: 20 };
const sidebarItemStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-app)', marginBottom: '5px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '13px' };
const addBtn = { background: 'var(--bg-header)', border: '1px solid #555', cursor: 'pointer', color: 'var(--accent)', borderRadius: '3px', fontWeight: 'bold', width: '20px' };
const toolbarStyle = { position: 'absolute', top: 10, left: 10, zIndex: 100, display: 'flex', gap: '10px' };
const toolBtn = { padding: '8px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-main)', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' };
const deleteBadgeStyle = { position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', background: '#e74c3c', color: 'white', border: '2px solid var(--bg-panel)', borderRadius: '50%', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', padding: 0 };

export default RelationshipWeb;