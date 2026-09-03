import React from 'react';
import { supabase } from '@/config/supabase.client';
import { useNavigate } from 'react-router-dom';
import styles from './TopNav.module.css';

export const TopNav: React.FC = () => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };
  
  return (
    <header className={styles.topNav}>
      <div className={styles.left}>
        <h2 className={styles.title}>Admin Dashboard</h2>
      </div>
      <div className={styles.right}>
        <button className={styles.logoutButton} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
};