import React, { useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext';

const ManuscriptStats = ({ compact = false }) => {
  const { projectData, setProjectData } = useProject();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  
  // Get word goal from settings or default to 50000
  const wordGoal = projectData.settings?.manuscriptWordGoal || 50000;

  const stats = useMemo(() => {
    const chapters = projectData.manuscript?.chapters || [];
    
    // Calculate total chapters
    const totalChapters = chapters.length;
    
    // Calculate total words across all chapters
    let totalWords = 0;
    let totalCharacters = 0;
    
    chapters.forEach(chapter => {
      if (chapter.content) {
        // Strip HTML tags
        const text = chapter.content.replace(/<[^>]+>/g, ' ');
        // Count words
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        totalWords += words.length;
        // Count characters (excluding whitespace)
        totalCharacters += text.replace(/\s/g, '').length;
      }
    });
    
    // Calculate reading time (average 200 words per minute)
    const readingTimeMinutes = Math.ceil(totalWords / 200);
    const readingHours = Math.floor(readingTimeMinutes / 60);
    const remainingMinutes = readingTimeMinutes % 60;
    
    // Calculate average chapter length
    const avgWordsPerChapter = totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0;
    
    return {
      totalChapters,
      totalWords,
      totalCharacters,
      readingTime: readingHours > 0 
        ? `${readingHours}h ${remainingMinutes}m`
        : `${readingTimeMinutes}m`,
      avgWordsPerChapter
    };
  }, [projectData]);

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
      }}>
        <span>{stats.totalChapters} chapters</span>
        <span>•</span>
        <span>{stats.totalWords.toLocaleString()} words</span>
        <span>•</span>
        <span>{stats.readingTime} read</span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: 'var(--bg-panel)',
      borderRadius: '8px',
      border: '1px solid var(--border)',
    }}>
      <h3 style={{
        fontSize: '0.875rem',
        fontWeight: '600',
        color: 'var(--text-main)',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        Manuscript Stats
      </h3>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <StatCard 
          label="Total Chapters" 
          value={stats.totalChapters}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          }
        />
        
        <StatCard 
          label="Total Words" 
          value={stats.totalWords.toLocaleString()}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="17" y1="10" x2="3" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="17" y1="18" x2="3" y2="18" />
            </svg>
          }
        />
        
        <StatCard 
          label="Reading Time" 
          value={stats.readingTime}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        
        <StatCard 
          label="Avg Words/Chapter" 
          value={stats.avgWordsPerChapter.toLocaleString()}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
          }
        />
        
        <StatCard 
          label="Total Characters" 
          value={stats.totalCharacters.toLocaleString()}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          }
        />
        
        <StatCard 
          label="Progress" 
          value={stats.totalWords >= wordGoal ? '🎉 Complete!' : `${Math.round((stats.totalWords / wordGoal) * 100)}%`}
          subtitle={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>to</span>
              {isEditingGoal ? (
                <input
                  type="number"
                  defaultValue={wordGoal}
                  onBlur={(e) => {
                    const newGoal = parseInt(e.target.value) || 50000;
                    setProjectData({
                      ...projectData,
                      settings: { ...projectData.settings, manuscriptWordGoal: newGoal }
                    });
                    setIsEditingGoal(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.target.blur();
                  }}
                  autoFocus
                  style={{
                    width: '60px',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--accent)',
                    color: 'var(--accent)',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontSize: '0.65rem',
                    outline: 'none'
                  }}
                />
              ) : (
                <span
                  onClick={() => setIsEditingGoal(true)}
                  style={{
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted'
                  }}
                >
                  {wordGoal.toLocaleString()}
                </span>
              )}
              <span>words</span>
            </div>
          }
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, subtitle, icon }) => {
  return (
    <div style={{
      padding: '0.75rem',
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '6px',
      border: '1px solid var(--border)',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      e.currentTarget.style.borderColor = 'var(--accent)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
      e.currentTarget.style.borderColor = 'var(--border)';
    }}
    >
      <div style={{
        color: 'var(--accent)',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.65rem',
          fontWeight: '500',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '0.25rem',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          color: 'var(--text-main)',
          lineHeight: '1',
        }}>
          {value}
        </div>
        {subtitle && (
          <div style={{
            fontSize: '0.65rem',
            color: 'var(--text-secondary)',
            marginTop: '0.25rem',
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManuscriptStats;
