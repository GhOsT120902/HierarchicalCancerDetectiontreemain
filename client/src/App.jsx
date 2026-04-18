import { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('medai_logged_in') === 'true');
  const [theme, setTheme] = useState(() => localStorage.getItem('medai_theme') || 'dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('medai_theme', theme);
  }, [theme]);

  const handleLogin = (email) => {
    localStorage.setItem('medai_logged_in', 'true');
    localStorage.setItem('medai_user_email', email);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('medai_logged_in');
    localStorage.removeItem('medai_user_email');
    setIsLoggedIn(false);
  };

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {isLoggedIn ? (
        <Dashboard onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
