// src/features/editor/SearchHighlight.js
import { Mark } from '@tiptap/core';

export const SearchHighlight = Mark.create({
  name: 'searchHighlight',
  parseHTML() {
    return [
      {
        tag: 'mark.search-highlight',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', { ...HTMLAttributes, class: 'search-highlight' }, 0];
  },
});
