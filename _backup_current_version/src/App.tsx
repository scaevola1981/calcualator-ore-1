import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Settings from './pages/Settings';
import Calculator from './pages/Calculator';
import { useWork } from './context/WorkContext';
import { useEffect } from 'react';

function AppContent() {
  const { settings } = useWork();

  useEffect(() => {
    // Apply theme to HTML element for Tailwind dark mode to work correctly
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Clean up body class just in case
    document.body.className = '';
  }, [settings.theme]);

  // Force dark mode vars if needed or toggle overrides
  return (
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<History />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
       <AppContent />
    </BrowserRouter>
  );
}

export default App;
