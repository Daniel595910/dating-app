/**
 * App Root Component
 */

import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './app.router';
import { AppShell } from './components/layout/AppShell';
import { useAuthStore } from './store/auth.store';
import { ToastContainer } from './components/common/ToastContainer';

const App: React.FC = () => {
  const refreshUser = useAuthStore((state) => state.refreshUser);
  
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);
  
  return (
    <BrowserRouter>
      <AppShell>
        <AppRouter />
      </AppShell>
      <ToastContainer />
    </BrowserRouter>
  );
};

export default App;