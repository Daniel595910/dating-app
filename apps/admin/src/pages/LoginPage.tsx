import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { Button, Input } from '@dating-app/ui';
import styles from './LoginPage.module.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (loginError) throw loginError;
      
      // Verify admin role
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user!.id)
        .single();
      
      const adminRoles = ['admin', 'super_admin', 'moderator'];
      if (!adminRoles.includes(userRecord?.role || '')) {
        await supabase.auth.signOut();
        throw new Error('Access denied. Admin privileges required.');
      }
      
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Admin Login</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@datingapp.com"
          />
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Your password"
          />
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" loading={loading} fullWidth>
            Login
          </Button>
        </form>
      </div>
    </div>
  );
};