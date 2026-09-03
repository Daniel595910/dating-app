import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import styles from './AdminShell.module.css';

interface AdminShellProps {
  children: React.ReactNode;
}

export const AdminShell: React.FC < AdminShellProps > = ({ children }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  
  if (isLoginPage) {
    return <>{children}</>;
  }
  
  return (
    <div className={styles.adminShell}>
      <Sidebar />
      <div className={styles.mainArea}>
        <TopNav />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};