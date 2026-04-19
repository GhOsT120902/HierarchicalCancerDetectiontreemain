import { useState, useEffect, useRef, useCallback } from 'react';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import GuidedTour from './components/GuidedTour';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('medai_logged_in') === 'true');
  const [theme, setTheme] = useState(() => localStorage.getItem('medai_theme') || 'dark');
  const tabChangerRef = useRef(null);

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

  const handleDemoLogin = useCallback(() => {
    localStorage.setItem('medai_demo_mode', 'true');
    localStorage.setItem('medai_tour_autostart', 'true');
    localStorage.setItem('medai_logged_in', 'true');
    localStorage.setItem('medai_user_email', 'demo@medai.demo');
    localStorage.setItem('medai_is_admin', 'true');
    localStorage.removeItem('medai_admin_token');
    setIsLoggedIn(true);
  }, []);

  const handleLogout = useCallback(async () => {
    const isDemoMode = localStorage.getItem('medai_demo_mode') === 'true';
    const adminToken = localStorage.getItem('medai_admin_token');

    if (!isDemoMode && adminToken) {
      try {
        const res = await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'X-Admin-Token': adminToken },
        });
        if (!res.ok) {
          console.warn('Admin session could not be invalidated on the server (status', res.status, ').');
        }
      } catch (err) {
        console.warn('Admin logout request failed (network error):', err);
      }
    }

    localStorage.removeItem('medai_logged_in');
    localStorage.removeItem('medai_user_email');
    localStorage.removeItem('medai_user_id');
    localStorage.removeItem('medai_is_admin');
    localStorage.removeItem('medai_admin_token');

    if (isDemoMode) {
      localStorage.removeItem('medai_demo_mode');
      localStorage.removeItem('medai_tour_autostart');
    }

    setIsLoggedIn(false);
  }, []);

  const handleTourLogout = useCallback(() => {
    localStorage.removeItem('medai_logged_in');
    localStorage.removeItem('medai_user_email');
    localStorage.removeItem('medai_user_id');
    localStorage.removeItem('medai_is_admin');
    localStorage.removeItem('medai_admin_token');
    setIsLoggedIn(false);
  }, []);

  const handleTourComplete = useCallback(() => {
    localStorage.removeItem('medai_tour_autostart');
  }, []);

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  };

  const registerTabChanger = useCallback((fn) => {
    tabChangerRef.current = fn;
  }, []);

  const handleTabChange = useCallback((tab) => {
    tabChangerRef.current?.(tab);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {isLoggedIn ? (
        <Dashboard
          onLogout={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
          onRegisterTabChanger={registerTabChanger}
        />
      ) : (
        <AuthScreen onLogin={handleLogin} onDemoLogin={handleDemoLogin} />
      )}
      <GuidedTour
        isLoggedIn={isLoggedIn}
        onTabChange={handleTabChange}
        onLogout={handleTourLogout}
        onTourComplete={handleTourComplete}
      />
    </div>
  );
}

export default App;
