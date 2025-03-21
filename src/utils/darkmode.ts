import { useEffect } from 'react'

export const enableTheme = (isDarkMode: Boolean, setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>) => {
  document.body.classList.remove('preload-style'); // Remove init styles
  document.documentElement.classList.toggle(
  "dark",
  localStorage.theme === "dark" ||
    (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches),
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark')
    }
  }, [])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light')
  }

  return [toggleDarkMode];
};
