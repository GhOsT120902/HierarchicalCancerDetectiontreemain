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

  const handleLogin = (email, userId, isAdmin = false, adminToken = '') => {
    localStorage.setItem('medai_logged_in', 'true');
    localStorage.setItem('medai_user_email', email);
    if (userId) localStorage.setItem('medai_user_id', userId);
    localStorage.setItem('medai_is_admin', isAdmin ? 'true' : 'false');
    if (isAdmin && adminToken) {
      localStorage.setItem('medai_admin_token', adminToken);
    } else {
      localStorage.removeItem('medai_admin_token');
    }
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    const adminToken = localStorage.getItem('medai_admin_token');
    if (adminToken) {
      try {
        const res = await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'X-Admin-Token': adminToken },
        });
        if (!res.ok) {
          console.warn('Admin session could not be invalidated on the server (status', res.status, '). The local session will still be cleared.');
        }
      } catch (err) {
        console.warn('Admin logout request failed (network error):', err, 'The local session will still be cleared.');
      }
    }
    localStorage.removeItem('medai_logged_in');
    localStorage.removeItem('medai_user_email');
    localStorage.removeItem('medai_user_id');
    localStorage.removeItem('medai_is_admin');
    localStorage.removeItem('medai_admin_token');
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
