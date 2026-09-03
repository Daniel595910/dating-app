import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AdminRouter } from './router';
import { AdminShell } from './components/layout/AdminShell';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AdminShell>
        <AdminRouter />
      </AdminShell>
    </BrowserRouter>
  );
};

export default App;