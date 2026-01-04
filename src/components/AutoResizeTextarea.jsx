import React, { useRef, useEffect } from 'react';

const AutoResizeTextarea = ({ value, onChange, placeholder, style }) => {
  const textareaRef = useRef(null);

  // Function to auto-grow the height
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset to calculate
      textarea.style.height = `${textarea.scrollHeight}px`; // Set to content height
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]); // Re-run whenever text changes

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        adjustHeight();
      }}
      placeholder={placeholder}
      rows={1}
      style={{
        width: '100%',
        resize: 'none',
        overflow: 'hidden',
        background: 'transparent',
        border: 'none',
        color: 'inherit',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        outline: 'none',
        padding: '0',
        minHeight: '20px',
        ...style
      }}
    />
  );
};

export default AutoResizeTextarea;