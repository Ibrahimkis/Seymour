import React, { useState, useMemo } from "react";
import { useProject } from "../../context/ProjectContext";
import ManuscriptStats from "../../components/ManuscriptStats";

const ChapterInspector = ({ chapterId, onFocusScene, focusedSceneId, onUpdateScene, onDeleteScene }) => {
  const { projectData, setProjectData } = useProject();
  const [activeTab, setActiveTab] = useState("notes");
  const [editingSceneId, setEditingSceneId] = useState(null);

  const chapter = projectData.manuscript?.chapters?.find((c) => c.id === chapterId);
  const chapterIndex = projectData.manuscript?.chapters?.findIndex((c) => c.id === chapterId);

  // --- ACTIONS ---
  const updateChapter = (updates) => {
    if (chapterIndex === -1) return;
    const newChapters = [...projectData.manuscript.chapters];
    newChapters[chapterIndex] = { ...chapter, ...updates };
    setProjectData({
      ...projectData,
      manuscript: { ...projectData.manuscript, chapters: newChapters },
    });
  };

  // --- ANALYTICS ENGINE ---
  if (!chapter) return null;
  const stats = useMemo(() => {
    if (!chapter.content) return null;

    // 1. Clean Text (strip HTML)
    const div = document.createElement("div");
    div.innerHTML = chapter.content;
    const text = div.innerText || div.textContent || "";

    // 2. Basic Counts
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    const wordCount = words.length;

    const sentenceCount =
      text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length || 1;

    const readTime = Math.ceil(wordCount / 250);

    // 3. Adverb Counter
    const adverbs = words.filter((w) => w.toLowerCase().endsWith("ly") && w.length > 4);

    // 4. Syllables & Grade (Flesch-Kincaid Grade Level-ish)
    let syllableCount = 0;
    words.forEach((w) => {
      const clean = w.toLowerCase().replace(/[^a-z]/g, "");
      if (clean.length <= 3) {
        syllableCount += 1;
        return;
      }
      const s = clean
        .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
        .match(/[aeiouy]{1,2}/g);
      syllableCount += s ? s.length : 1;
    });
    const grade =
      0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / Math.max(1, wordCount)) - 15.59;

    const gradeLevel = Math.max(0, Math.round(grade * 10) / 10);

    // 5. Word Frequency
    const stopWords = new Set([
      "the",
      "and",
      "to",
      "of",
      "a",
      "in",
      "that",
      "is",
      "was",
      "he",
      "she",
      "it",
      "for",
      "on",
      "with",
      "as",
      "his",
      "her",
      "at",
      "be",
      "this",
      "have",
      "from",
      "or",
      "one",
      "had",
      "by",
      "word",
      "but",
      "not",
      "what",
      "all",
      "were",
      "we",
      "when",
      "your",
      "can",
      "said",
    ]);
    // ...existing code...
    // Calculate topWords, etc.
    const frequency = {};
    words.forEach((w) => {
      const clean = w.toLowerCase().replace(/[^a-z]/g, "");
      if (!clean) return;
      if (!stopWords.has(clean) && clean.length > 2) {
        frequency[clean] = (frequency[clean] || 0) + 1;
      }
    });
    const topWords = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { wordCount, sentenceCount, readTime, adverbs, gradeLevel, topWords };
  }, [chapter?.content]);

  return (
    <div style={containerStyle}>
      {/* TABS */}
      <div style={tabContainerStyle}>
        <button
          onClick={() => setActiveTab("notes")}
          style={activeTab === "notes" ? activeTabStyle : tabStyle}
        >
          📝 Notes
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          style={activeTab === "analytics" ? activeTabStyle : tabStyle}
        >
          📊 Analytics
        </button>
        <button
          onClick={() => setActiveTab("manuscript")}
          style={activeTab === "manuscript" ? activeTabStyle : tabStyle}
        >
          📚 Manuscript
        </button>
      </div>

      {/* CONTENT AREA */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* --- TAB: NOTES & SYNOPSIS --- */}
        {activeTab === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* SYNOPSIS */}
            <div>
              <div style={labelStyle}>CHAPTER SYNOPSIS</div>
              <textarea
                value={chapter.synopsis || ""}
                onChange={(e) => updateChapter({ synopsis: e.target.value })}
                placeholder="What happens in this chapter?"
                style={textareaStyle}
              />
            </div>

            <div style={divider}></div>

            {/* NOTES */}
            <div>
              <div style={labelStyle}>CHAPTER NOTES</div>
              <textarea
                value={chapter.notes || ""}
                onChange={(e) => updateChapter({ notes: e.target.value })}
                placeholder="Ideas, reminders, continuity checks..."
                style={{ ...textareaStyle, minHeight: "200px" }}
              />
            </div>
          </div>
        )}

        {/* --- TAB: ANALYTICS --- */}
        {activeTab === "analytics" && stats && (
          <React.Fragment>
            <div style={gridStyle}>
              <div style={metricBox}>
                <div style={metricVal}>{stats.wordCount}</div>
                <div style={metricLabel}>Words</div>
              </div>
              <div style={metricBox}>
                <div style={metricVal}>
                  {stats.readTime} <span style={{ fontSize: "10px" }}>min</span>
                </div>
                <div style={metricLabel}>Read Time</div>
              </div>
            </div>

            <div style={divider}></div>

            <div style={{ marginBottom: "20px" }}>
              <div style={labelStyle}>READABILITY GRADE</div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: getGradeColor(stats.gradeLevel),
                  }}
                >
                  {stats.gradeLevel}
                </div>
                <div style={{ fontSize: "11px", color: "#888", lineHeight: "1.2" }}>
                  {getGradeText(stats.gradeLevel)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={labelStyle}>ADVERB USAGE</div>
              <div style={{ fontSize: "13px", color: "var(--text-main)", marginBottom: "5px" }}>
                Count: {" "}
                <span
                  style={{
                    fontWeight: "bold",
                    color:
                      stats.adverbs.length > (stats.wordCount / 100) * 3
                        ? "#e74c3c"
                        : "#2ecc71",
                  }}
                >
                  {stats.adverbs.length}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#666", fontStyle: "italic" }}>
                (Aim for &lt; 3%)
              </div>
            </div>

            <div style={divider}></div>

            <div>
              <div style={labelStyle}>MOST USED WORDS</div>
              {stats.topWords.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Not enough content to analyze.
                </div>
              ) : (
                stats.topWords.map(([word, count], i) => (
                  <div key={i} style={rowStyle}>
                    <span style={{ color: "var(--text-main)" }}>{word}</span>
                    <div style={barContainer}>
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            (count / stats.topWords[0][1]) * 100
                          )}%`,
                          height: "100%",
                          background: "var(--accent)",
                          opacity: 0.5,
                          borderRadius: "2px",
                        }}
                      ></div>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        minWidth: "20px",
                        textAlign: "right",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </React.Fragment>
        )}

        {/* --- TAB: MANUSCRIPT STATS --- */}
        {activeTab === "manuscript" && (
          <div>
            <ManuscriptStats />
          </div>
        )}
      </div>
    </div>
  );
  }

  const activeTabStyle = {
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "6px 6px 0 0",
    fontWeight: "bold",
    padding: "8px 16px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };

  const tabStyle = {
    background: "transparent",
    color: "var(--text-main)",
    border: "none",
    borderRadius: "6px 6px 0 0",
    fontWeight: "normal",
    padding: "8px 16px",
    cursor: "pointer",
  };

  const tabContainerStyle = {
    display: "flex",
    gap: "8px",
    padding: "12px 20px 0 20px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-app)",
  };

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "var(--bg-app)",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };

  const labelStyle = {
  fontSize: "10px",
  fontWeight: "bold",
  color: "var(--accent)",
  marginBottom: "8px",
  textTransform: "uppercase",
};

const divider = { height: "1px", background: "var(--border)", margin: "20px 0" };

const metricBox = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: "var(--bg-app)",
  borderRadius: "6px",
  padding: "16px 0",
  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
};

const metricVal = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "var(--accent)",
  marginBottom: "4px",
};

const getGradeColor = (gradeLevel) => {
  if (gradeLevel < 5) return "#2ecc71"; // Green
  if (gradeLevel < 8) return "#f1c40f"; // Yellow
  return "#e74c3c"; // Red
};

const getGradeText = (gradeLevel) => {
  if (gradeLevel < 5) return "Easy to read (Elementary)";
  if (gradeLevel < 8) return "Fairly readable (Middle/High School)";
  return "Challenging (College+)";
};

const metricLabel = {
  fontSize: "11px",
  color: "#888",
  fontWeight: "bold",
  textTransform: "uppercase",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
  marginBottom: "20px",
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "6px",
  fontSize: "13px",
};

const barContainer = {
  flex: 1,
  height: "6px",
  background: "var(--bg-app)",
  borderRadius: "2px",
  overflow: "hidden",
};

// UPDATED TEXTAREA STYLE
const textareaStyle = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "100px",
  background: "var(--bg-app)",
  border: "1px solid var(--border)",
  color: "var(--text-main)",
  padding: "10px",
  borderRadius: "4px",
  fontSize: "13px",
  lineHeight: "1.5",
  resize: "vertical",
  outline: "none",
};

export default ChapterInspector;