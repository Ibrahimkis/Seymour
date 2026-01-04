import { Mark, mergeAttributes } from '@tiptap/core';

export const LoreMark = Mark.create({
  name: 'loreLink',

  // It renders as a <span> tag
  parseHTML() {
    return [{ tag: 'span.lore-link' }];
  },

  renderHTML({ HTMLAttributes }) {
    // Add the class 'lore-link' to whatever we wrap
    return ['span', mergeAttributes(HTMLAttributes, { class: 'lore-link' }), 0];
  },

  // Allow us to store the character ID inside the tag later
  addAttributes() {
    return {
      charId: {
        default: null,
      },
    };
  },
});