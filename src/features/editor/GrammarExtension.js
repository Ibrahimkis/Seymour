// Grammar checking extension for TipTap editor
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const grammarPluginKey = new PluginKey('grammar');

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Grammar check disabled due to CORS restrictions
// To enable, you need to either:
// 1. Set up a backend proxy for LanguageTool API
// 2. Use LanguageTool's premium API with CORS support
// 3. Run your own LanguageTool server
async function checkGrammar(text) {
  // Grammar checking temporarily disabled
  return [];
  
  /* Original implementation - disabled due to CORS
  if (!text || text.trim().length < 3) return [];
  
  try {
    const response = await fetch('https://languagetool.org/api/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        language: 'en-US',
        enabledOnly: 'false'
      })
    });
    
    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    // Silently fail - CORS restrictions prevent direct API access
    return [];
  }
  */
}

export const GrammarExtension = Extension.create({
  name: 'grammar',

  addProseMirrorPlugins() {
    const editor = this.editor;
    let grammarErrors = [];

    // Debounced grammar check function
    const performGrammarCheck = debounce(async (state) => {
      const text = state.doc.textContent;
      const matches = await checkGrammar(text);
      
      grammarErrors = matches.map(match => ({
        from: match.offset,
        to: match.offset + match.length,
        message: match.message,
        replacements: match.replacements.slice(0, 5).map(r => r.value),
        type: match.rule.issueType // 'misspelling', 'grammar', 'style', etc.
      }));

      // Trigger a view update to show decorations
      editor.view.dispatch(editor.state.tr.setMeta('grammarUpdate', true));
    }, 3000); // Check 3 seconds after user stops typing

    return [
      new Plugin({
        key: grammarPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            // If document changed, schedule a grammar check
            if (tr.docChanged) {
              performGrammarCheck(tr);
            }

            // Create decorations for grammar errors
            const decorations = grammarErrors.map(error => {
              // Ensure positions are valid
              if (error.from >= tr.doc.content.size || error.to > tr.doc.content.size) {
                return null;
              }

              const color = error.type === 'misspelling' ? 'red' : 'blue';
              
              return Decoration.inline(error.from, error.to, {
                class: `grammar-error grammar-${error.type}`,
                style: `border-bottom: 2px wavy ${color};`,
                'data-message': error.message,
                'data-replacements': JSON.stringify(error.replacements)
              });
            }).filter(Boolean);

            return DecorationSet.create(tr.doc, decorations);
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleDOMEvents: {
            contextmenu(view, event) {
              // Find if we're right-clicking on a grammar error
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!pos) return false;
              
              const decorations = grammarPluginKey.getState(view.state);
              const found = decorations.find(pos.pos, pos.pos);
              
              if (found.length > 0) {
                const decoration = found[0];
                const message = decoration.type.attrs['data-message'];
                const replacements = JSON.parse(decoration.type.attrs['data-replacements'] || '[]');
                
                // Store grammar suggestion data for context menu
                window.grammarSuggestion = {
                  from: decoration.from,
                  to: decoration.to,
                  message,
                  replacements
                };
              } else {
                window.grammarSuggestion = null;
              }
              
              return false; // Allow context menu to show
            }
          }
        }
      })
    ];
  }
});
