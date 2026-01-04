import React, { useState } from 'react';

const Wordsmith = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [synonyms, setSynonyms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setSynonyms([]);

    try {
      // 1. FETCH DEFINITIONS
      const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`);
      if (!dictRes.ok) throw new Error("Word not found.");
      const dictData = await dictRes.json();
      setResults(dictData[0]);

      // 2. FETCH SYNONYMS (Datamuse API)
      const thesRes = await fetch(`https://api.datamuse.com/words?rel_syn=${query}`);
      const thesData = await thesRes.json();
      setSynonyms(thesData.slice(0, 15)); // Top 15 synonyms

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Allow clicking a synonym to search it immediately
  const clickWord = (word) => {
    setQuery(word);
    //Trigger search manually since state update is async
    // (We just auto-submit effectively)
    document.getElementById('word-search-btn').click(); 
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-main)' }}>
      
      {/* SEARCH BAR */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Look up a word..." 
          style={inputStyle}
        />
        <button id="word-search-btn" type="submit" style={btnStyle} disabled={loading}>
          {loading ? '...' : '🔍'}
        </button>
      </form>

      {/* ERROR STATE */}
      {error && (
        <div style={{ color: '#e74c3c', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
          {error}
        </div>
      )}

      {/* RESULTS AREA */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
        
        {results && (
          <div>
            {/* HEADER */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '15px' }}>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', textTransform: 'capitalize' }}>
                {results.word}
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'monospace' }}>
                {results.phonetic}
              </div>
            </div>

            {/* SYNONYMS (Thesaurus) */}
            {synonyms.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={sectionLabel}>SYNONYMS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {synonyms.map((s, i) => (
                    <span 
                      key={i} 
                      onClick={() => clickWord(s.word)}
                      style={tagStyle}
                    >
                      {s.word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* DEFINITIONS */}
            {results.meanings.map((meaning, index) => (
              <div key={index} style={{ marginBottom: '20px' }}>
                <div style={{ ...sectionLabel, color: 'var(--text-main)', fontStyle: 'italic' }}>
                  {meaning.partOfSpeech}
                </div>
                <ul style={{ paddingLeft: '15px', margin: '5px 0', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                  {meaning.definitions.slice(0, 3).map((def, idx) => (
                    <li key={idx} style={{ marginBottom: '5px' }}>
                      {def.definition}
                      {def.example && (
                        <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                          "{def.example}"
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!results && !loading && !error && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '40px' }}>
            Enter a word above to find definitions and synonyms.
          </div>
        )}
      </div>
    </div>
  );
};

// --- STYLES ---
const inputStyle = {
  flex: 1,
  background: 'var(--bg-app)',
  border: '1px solid var(--border)',
  color: 'var(--text-main)',
  padding: '8px',
  borderRadius: '4px',
  outline: 'none'
};

const btnStyle = {
  background: 'var(--bg-header)',
  border: '1px solid var(--border)',
  color: 'var(--text-main)',
  width: '40px',
  borderRadius: '4px',
  cursor: 'pointer'
};

const sectionLabel = {
  fontSize: '10px',
  fontWeight: 'bold',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '8px'
};

const tagStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '2px 10px',
  fontSize: '11px',
  color: 'var(--accent)',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

// Add hover effect via tag
const styleTag = document.createElement("style");
styleTag.innerHTML = `
  span[style*="cursor: pointer"]:hover { background: var(--accent) !important; color: white !important; }
`;
document.head.appendChild(styleTag);

export default Wordsmith;