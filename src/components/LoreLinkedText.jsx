import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import AutoResizeTextarea from './AutoResizeTextarea';

const LoreLinkedText = ({ value, onChange, placeholder, style, editable = true, manualLinks = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { projectData } = useProject();
  const navigate = useNavigate();
  const textareaRef = useRef(null);

  // Auto-enable editing when field becomes empty
  useEffect(() => {
    if (!value || value.trim() === '') {
      setIsEditing(true);
    }
  }, [value]);

  // Helper function to escape HTML
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Process text to add lore links
  const processedContent = useMemo(() => {
    if (!value || !projectData?.lore?.characters) return value;

    const entities = projectData.lore.characters;
    let text = value;
    const links = [];

    // Add manual links first (these take priority)
    manualLinks.forEach(manualLink => {
      const escapedText = manualLink.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedText})\\b`, 'gi');
      
      let match;
      while ((match = regex.exec(text)) !== null) {
        const targetEntity = entities.find(e => e.id === manualLink.targetId);
        if (targetEntity) {
          links.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            entityId: targetEntity.id,
            entityName: targetEntity.name,
            isManual: true
          });
        }
      }
    });

    // Find all entity mentions (names + aliases)
    entities.forEach(entity => {
      const terms = [entity.name, ...(entity.aliases || [])];
      
      terms.forEach(term => {
        if (!term || term.trim().length < 2) return;
        
        // Escape special regex characters
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match whole words only
        const regex = new RegExp(`\\b(${escapedTerm})\\b`, 'gi');
        
        let match;
        while ((match = regex.exec(text)) !== null) {
          links.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            entityId: entity.id,
            entityName: entity.name,
            isManual: false
          });
        }
      });
    });

    // Sort by start position and remove overlaps (manual links take priority, then keep longest/first match)
    links.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.isManual !== b.isManual) return a.isManual ? -1 : 1; // Manual links first
      return 0;
    });
    
    const filteredLinks = [];
    let lastEnd = -1;
    
    for (const link of links) {
      if (link.start >= lastEnd) {
        filteredLinks.push(link);
        lastEnd = link.end;
      }
    }

    // Build HTML with lore links
    if (filteredLinks.length === 0) return text;

    let html = '';
    let lastIndex = 0;

    filteredLinks.forEach(link => {
      // Add text before link
      html += escapeHtml(text.substring(lastIndex, link.start));
      // Add link
      html += `<span class="lore-link" data-entity-id="${link.entityId}" data-entity-name="${escapeHtml(link.entityName)}">${escapeHtml(link.text)}</span>`;
      lastIndex = link.end;
    });

    // Add remaining text
    html += escapeHtml(text.substring(lastIndex));

    return html;
  }, [value, projectData, manualLinks]);

  const handleLinkClick = (e) => {
    if (e.target.classList.contains('lore-link')) {
      e.preventDefault();
      e.stopPropagation();
      const entityId = e.target.getAttribute('data-entity-id');
      if (entityId) {
        navigate(`/lore?id=${entityId}`);
      }
    }
  };

  const handleDisplayClick = (e) => {
    // Only enter edit mode if clicking on non-link area
    if (editable && !e.target.classList.contains('lore-link')) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  // If editing or no value, show textarea
  if (isEditing || !value || value.trim() === '') {
    return (
      <AutoResizeTextarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={style}
        autoFocus={isEditing}
        onBlur={editable ? handleBlur : undefined}
      />
    );
  }

  // Display mode with lore links
  return (
    <div
      onClick={handleDisplayClick}
      onClickCapture={handleLinkClick}
      style={{
        minHeight: '20px',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        cursor: editable ? 'text' : 'default',
        color: 'inherit',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: '1.5',
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
};

export default LoreLinkedText;
