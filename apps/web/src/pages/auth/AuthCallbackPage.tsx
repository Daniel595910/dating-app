/**
 * AuthCallbackPage
 *
 * Landing page after Google OAuth. Supabase puts the session in the URL
 * hash and the SDK picks it up automatically via the onAuthStateChange
 * listener. We just wait for the session, then decide:
 *
 *   - If the user has no profile yet OR is missing first_name (new Google
 *     signup) -> route to /register/complete (profile completion wizard)
 *   - Otherwise -> route to /community
 *
 * On failure, routes back to /login with an error toast.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { ROUTES } from '@/config/constants';
import { LoadingScreen } from '@/components/common/LoadingScreen';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      // Wait briefly for the SDK to consume the hash and establish the session.
      // Retry a few times in case the redirect lands before the SDK is ready.
      let session = null;
      for (let i = 0; i < 6; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          session = data.session;
          break;
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      if (cancelled) return;

      if (!session) {
        setMessage('Sign-in failed. Redirecting to login…');
        setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 1500);
        return;
      }

      // Check if the profile exists and has a name already
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, birth_date, gender')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      const needsCompletion =
        !profile ||
        !profile.first_name ||
        !profile.birth_date ||
        !profile.gender;

      if (needsCompletion) {
        // New signup via Google - collect the missing fields
        navigate('/register/complete', { replace: true });
      } else {
        navigate(ROUTES.COMMUNITY, { replace: true });
      }
    };

    finish();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return <LoadingScreen message={message} />;
};