import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { communityService } from '@/features/community/services/community.service';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

export const JoinCommunityPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [state, setState] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setState('error');
        setMessage('No invite token provided.');
        return;
      }
      if (!user) {
        setState('error');
        setMessage('You must be signed in to join.');
        return;
      }

      const result = await communityService.joinViaInvite(token, user.id);

      if (!result.success) {
        setState('error');
        setMessage(result.error || 'Could not join community.');
        return;
      }

      setSlug(result.communitySlug || null);
      if (result.requiresApproval) {
        setState('pending');
        setMessage('Your request has been sent to the community admins.');
      } else {
        setState('success');
        setMessage('You have joined the community.');
      }
    };
    run();
  }, [token, user]);

  const goToCommunity = () => {
    if (slug) navigate(`/community`);
    else navigate('/discover-communities');
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backgroundColor: '#faf9f7' }}>
      <div style={{ maxWidth: 380, width: '100%', backgroundColor: '#ffffff', borderRadius: '1rem', padding: '2rem 1.5rem', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        {state === 'loading' && (
          <>
            <Loader2 size={40} style={{ color: '#ef4444', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>Joining…</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Checking your invite link.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 size={40} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>Welcome in!</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.5rem' }}>{message}</p>
            <button onClick={goToCommunity} style={{ width: '100%', padding: '0.875rem', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '9999px', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }}>
              Open Community
            </button>
          </>
        )}

        {state === 'pending' && (
          <>
            <Clock size={40} style={{ color: '#f59e0b', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>Request sent</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.5rem' }}>{message}</p>
            <button onClick={() => navigate('/discover-communities')} style={{ width: '100%', padding: '0.875rem', backgroundColor: '#f3f4f6', color: '#111827', border: 'none', borderRadius: '9999px', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }}>
              Discover Communities
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle size={40} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>Could not join</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.5rem' }}>{message}</p>
            <button onClick={() => navigate('/discover-communities')} style={{ width: '100%', padding: '0.875rem', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '9999px', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }}>
              Discover Communities
            </button>
          </>
        )}
      </div>
    </div>
  );
};