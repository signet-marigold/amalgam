module.exports = {
  darkMode: 'class', // or 'media'
  theme: {
    extend: {
      textColor: {
        skin: {
          base: 'var(--color-text-base)',
          muted: 'var(--color-text-muted)',
          inverted: 'var(--color-text-inverted)',
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};

