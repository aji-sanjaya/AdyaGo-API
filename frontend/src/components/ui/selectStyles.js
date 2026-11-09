export const getCustomSelectStyles = (isDark, options = {}) => {
  const targetHeight = options.height || options.minHeight || '38px';
  return {
    control: (base, state) => ({
      ...base,
      backgroundColor: isDark
        ? state.isDisabled ? '#0b0f19' : '#020617'
        : state.isDisabled ? '#f1f5f9' : '#f8fafc',
      borderColor: isDark
        ? state.isFocused ? '#22d3ee' : '#1e293b'
        : state.isFocused ? '#6366f1' : '#e2e8f0',
      borderRadius: options.borderRadius || '0.5rem',
      minHeight: targetHeight,
      height: targetHeight,
      boxShadow: state.isFocused
        ? isDark
          ? '0 0 0 3px rgba(34, 211, 238, 0.15)'
          : '0 0 0 3px rgba(99, 102, 241, 0.15)'
        : 'none',
      '&:hover': {
        borderColor: isDark
          ? state.isFocused ? '#22d3ee' : '#334155'
          : state.isFocused ? '#6366f1' : '#cbd5e1',
      },
      fontSize: options.fontSize || '0.75rem',
      fontFamily: options.fontFamily || "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      color: isDark ? '#f8fafc' : '#0f172a',
      transition: 'all 0.15s ease-in-out',
    }),
    valueContainer: (base) => ({
      ...base,
      height: targetHeight,
      padding: '0 10px',
      display: 'flex',
      alignItems: 'center',
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: targetHeight,
    }),
  menu: (base) => ({
    ...base,
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderRadius: '1rem',
    boxShadow: isDark
      ? '0 20px 30px -5px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(30, 41, 59, 0.8)'
      : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(226, 232, 240, 0.8)',
    border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 99999,
  }),
  menuList: (base) => ({
    ...base,
    padding: '6px',
    maxHeight: options.maxMenuHeight || '220px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#4f46e5'
      : state.isFocused
      ? isDark ? '#1e293b' : '#eef2ff'
      : 'transparent',
    color: state.isSelected
      ? '#ffffff'
      : state.isFocused
      ? isDark ? '#38bdf8' : '#4338ca'
      : isDark ? '#cbd5e1' : '#1e293b',
    borderRadius: options.borderRadius || '0.625rem',
    padding: '7px 12px',
    fontSize: options.fontSize || '0.75rem',
    fontFamily: options.fontFamily || "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontWeight: state.isSelected ? '600' : '400',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  }),
  singleValue: (base) => ({
    ...base,
    color: isDark ? '#f8fafc' : '#0f172a',
    fontWeight: '500',
    fontSize: options.fontSize || '0.75rem',
    fontFamily: options.fontFamily || "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  }),
  input: (base) => ({
    ...base,
    color: isDark ? '#f8fafc' : '#0f172a',
    fontSize: options.fontSize || '0.75rem',
    fontFamily: options.fontFamily || "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  }),
  placeholder: (base) => ({
    ...base,
    color: isDark ? '#64748b' : '#94a3b8',
    fontSize: options.fontSize || '0.75rem',
    fontFamily: options.fontFamily || "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: isDark ? '#64748b' : '#94a3b8',
    transition: 'all 0.2s ease',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : null,
    '&:hover': {
      color: isDark ? '#38bdf8' : '#6366f1',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: isDark ? '#64748b' : '#94a3b8',
    '&:hover': {
      color: '#f43f5e',
    },
  }),
  };
};

