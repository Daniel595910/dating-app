import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { ROUTES } from '@/config/constants';
import { Heart, Sparkles, ShieldCheck, ArrowRight, Users } from 'lucide-react';
import styles from './WelcomePage.module.css';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate(ROUTES.COMMUNITY, { replace: true });
      }
    })();
  }, [navigate]);

  const goTo = (path: string) => {
    setExiting(true);
    setTimeout(() => navigate(path), 280);
  };

  return (
    <div className={`${styles.page} ${exiting ? styles.exiting : ''}`}>
      <div className={styles.bgBlob1} aria-hidden="true" />
      <div className={styles.bgBlob2} aria-hidden="true" />

      <div className={styles.container}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>SG</div>
          <span className={styles.brandName}>Dating App</span>
        </div>

        <div className={styles.hero}>
          <div className={styles.badge}>
            <Sparkles size={14} />
            <span>Trusted by real people near you</span>
          </div>

          <h1 className={styles.headline}>
            Find your <span className={styles.highlight}>person</span>
          </h1>
          <p className={styles.tagline}>
            Real connections with verified members in your area. No fakes. No games. Just people you will actually want to meet.
          </p>

          <div className={styles.features}>
            <div className={styles.feature}>
              <ShieldCheck size={16} />
              <span>Verified members</span>
            </div>
            <div className={styles.feature}>
              <Users size={16} />
              <span>Local communities</span>
            </div>
            <div className={styles.feature}>
              <Heart size={16} />
              <span>Real matches</span>
            </div>
          </div>
        </div>

        <div className={styles.ctas}>
          <button
            className={styles.primaryButton}
            onClick={() => goTo(ROUTES.REGISTER)}
          >
            <span>Create account</span>
            <ArrowRight size={18} />
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() => goTo(ROUTES.LOGIN)}
          >
            <span>I already have an account</span>
          </button>
        </div>

        <p className={styles.legal}>
          By continuing, you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};
