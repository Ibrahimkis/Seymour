// src/components/UniversalSearch.jsx
// Universal search across chapters, lore, timeline, and all project data

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';

const UniversalSearch = ({ isOpen, onClose }) => {
  const { projectData } = useProject();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTerm = query.toLowerCase();
    const allResults = [];

    // Search Chapters
    projectData.manuscript?.chapters?.forEach((chapter) => {
      // Check title
      if (chapter.title.toLowerCase().includes(searchTerm)) {
        allResults.push({
          type: 'chapter',
          id: chapter.id,
          title: chapter.title,
          subtitle: 'Chapter',
          icon: '📄',
          path: `/editor?id=${chapter.id}`
        });
      }
      
      // Check content (strip HTML and search)
      const plainText = chapter.content
        ?.replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .toLowerCase();
      
      if (plainText?.includes(searchTerm) && !chapter.title.toLowerCase().includes(searchTerm)) {
        const index = plainText.indexOf(searchTerm);
        const snippet = plainText.substring(Math.max(0, index - 40), index + 60);
        allResults.push({
          type: 'chapter-content',
          id: chapter.id,
          title: chapter.title,
          subtitle: `...${snippet}...`,
          icon: '📝',
          path: `/editor?id=${chapter.id}`
        });
      }
    });

    // Search Lore Entities
    projectData.lore?.characters?.forEach((char) => {
      if (char.name.toLowerCase().includes(searchTerm)) {
        allResults.push({
          type: 'lore',
          id: char.id,
          title: char.name,
          subtitle: `${char.type || 'Entity'} - Lore Database`,
          icon: '🔖',
          path: `/lore?id=${char.id}`
        });
      }
      
      // Check aliases
      char.aliases?.forEach(alias => {
        if (alias.toLowerCase().includes(searchTerm) && !char.name.toLowerCase().includes(searchTerm)) {
          allResults.push({
            type: 'lore-alias',
            id: char.id,
            title: char.name,
            subtitle: `Alias: "${alias}" - ${char.type || 'Entity'}`,
            icon: '🏷️',
            path: `/lore?id=${char.id}`
          });
        }
      });
      
      // Check biography
      if (char.biography?.toLowerCase().includes(searchTerm)) {
        allResults.push({
          type: 'lore-bio',
          id: char.id,
          title: char.name,
          subtitle: `Biography mentions "${query}"`,
          icon: '📖',
          path: `/lore?id=${char.id}`
        });
      }
    });

    // Search Timeline Events
    projectData.timeline?.forEach((event) => {
      if (event.title?.toLowerCase().includes(searchTerm) || 
          event.desc?.toLowerCase().includes(searchTerm) ||
          event.displayDate?.toLowerCase().includes(searchTerm)) {
        allResults.push({
          type: 'timeline',
          id: event.id,
          title: event.title,
          subtitle: `${event.displayDate || event.year} - Chronicle`,
          icon: '⏳',
          path: '/chronicle'
        });
      }
    });

    // Search Relationship Webs
    projectData.relationships?.forEach((graph) => {
      if (graph.name?.toLowerCase().includes(searchTerm)) {
        allResults.push({
          type: 'relationship',
          id: graph.id,
          title: graph.name,
          subtitle: 'Relationship Web',
          icon: '🕸️',
          path: '/relationships'
        });
      }
    });

    // Search World Maps
    projectData.worldMap?.forEach?.((map) => {
      if (map.name?.toLowerCase().includes(searchTerm)) {
        allResults.push({
          type: 'map',
          id: map.id,
          title: map.name,
          subtitle: 'World Map',
          icon: '🗺️',
          path: '/map'
        });
      }
    });

    // Limit results to 50 for performance
    setResults(allResults.slice(0, 50));
    setSelectedIndex(0);
  }, [query, projectData]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (result) => {
    // Emit force-save before navigation
    window.dispatchEvent(new CustomEvent('force-save-all'));
    navigate(result.path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div style={overlayStyle} onClick={onClose} />
      
      {/* Search Modal */}
      <div style={modalStyle}>
        {/* Search Input */}
        <div style={inputContainerStyle}>
          <span style={{ fontSize: '20px', marginRight: '10px' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search chapters, lore, timeline..."
            style={inputStyle}
          />
          <kbd style={kbdStyle}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={resultsContainerStyle}>
          {results.length === 0 && query.trim() && (
            <div style={noResultsStyle}>
              No results found for "{query}"
            </div>
          )}
          
          {results.length === 0 && !query.trim() && (
            <div style={hintStyle}>
              <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>Quick Search Tips:</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                • Search chapter titles and content<br/>
                • Find lore entities by name or alias<br/>
                • Look up timeline events<br/>
                • Navigate to maps and relationship webs
              </div>
            </div>
          )}

          {results.map((result, index) => (
            <div
              key={`${result.type}-${result.id}-${index}`}
              style={{
                ...resultItemStyle,
                background: index === selectedIndex ? 'var(--accent)' : 'transparent',
                color: index === selectedIndex ? 'white' : 'var(--text-main)'
              }}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span style={{ fontSize: '20px', marginRight: '12px' }}>{result.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>
                  {result.title}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  opacity: 0.8,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {result.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div style={footerStyle}>
            <span style={footerHintStyle}>
              <kbd style={kbdSmallStyle}>↑↓</kbd> Navigate
            </span>
            <span style={footerHintStyle}>
              <kbd style={kbdSmallStyle}>↵</kbd> Open
            </span>
            <span style={footerHintStyle}>
              <kbd style={kbdSmallStyle}>ESC</kbd> Close
            </span>
          </div>
        )}
      </div>
    </>
  );
};

// Styles
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  backdropFilter: 'blur(4px)',
  zIndex: 9999
};

const modalStyle = {
  position: 'fixed',
  top: '15%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '600px',
  maxWidth: '90vw',
  maxHeight: '70vh',
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  zIndex: 10000,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  animation: 'scaleIn 0.2s ease-out'
};

const inputContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '15px 20px',
  borderBottom: '1px solid var(--border)'
};

const inputStyle = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  fontSize: '16px',
  color: 'var(--text-main)',
  fontWeight: '500'
};

const kbdStyle = {
  padding: '4px 8px',
  background: 'var(--bg-app)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  fontSize: '11px',
  fontFamily: 'monospace',
  color: 'var(--text-muted)'
};

const kbdSmallStyle = {
  ...kbdStyle,
  padding: '2px 6px',
  fontSize: '10px'
};

const resultsContainerStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '5px'
};

const resultItemStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 15px',
  borderRadius: '4px',
  cursor: 'pointer',
  marginBottom: '2px',
  transition: 'all 0.15s ease'
};

const noResultsStyle = {
  padding: '40px 20px',
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: '14px'
};

const hintStyle = {
  padding: '30px 20px',
  color: 'var(--text-main)',
  textAlign: 'center'
};

const footerStyle = {
  display: 'flex',
  gap: '15px',
  padding: '10px 20px',
  borderTop: '1px solid var(--border)',
  background: 'var(--bg-app)',
  fontSize: '11px',
  color: 'var(--text-muted)'
};

const footerHintStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px'
};

export default UniversalSearch;
