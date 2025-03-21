interface ThemeToggleButtonProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const darkIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
</svg>`;

export const lightIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
</svg>`;

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ isDarkMode, toggleDarkMode}) => {
  return (
      <button
        className="cursor-pointer w-12 h-5 rounded-full bg-gray-200 dark:bg-white focus:outline-none shadow"
        onClick={toggleDarkMode}
      >
        <div
          className={`w-8 h-8 -translate-y-3.5 relative rounded-full transition-all duration-400 transform ${
            isDarkMode
              ? 'bg-gray-700 translate-x-2'
              : 'bg-yellow-500 -translate-x-6'
          } p-1 text-white`}
          dangerouslySetInnerHTML={{
            __html: isDarkMode ? darkIcon : lightIcon,
          }}
        />
      </button>
  );
}

export default ThemeToggleButton;
