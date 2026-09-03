import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { ROUTES } from '@/config/constants';
import { LoadingScreen } from '@/components/common/LoadingScreen';

export const ConfirmEmail: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const { error } = await supabase.auth.refreshSession();
        
        if (error) {
          setStatus('error');
          setMessage(error.message || 'Failed to verify email');
          return;
        }

        setStatus('success');
        setMessage('Email confirmed successfully! Redirecting to login...');
        
        setTimeout(() => {
          navigate(ROUTES.LOGIN);
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to verify email');
      }
    };

    verifyEmail();
  }, [navigate]);

  if (status === 'verifying') {
    return <LoadingScreen message={message} />;
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: status === 'success' ? '#10b981' : '#ef4444' }}>
        {status === 'success' ? '✅ Email Confirmed!' : '❌ Verification Failed'}
      </h1>
      <p style={{ color: '#6b7280', fontSize: '1rem' }}>{message}</p>
      {status === 'error' && (
        <button
          onClick={() => navigate(ROUTES.LOGIN)}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Go to Login
        </button>
      )}
    </div>
  );
};
