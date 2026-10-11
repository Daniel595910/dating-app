import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paystackService } from '@/services/paystack.service';
import { Check, X, Loader } from 'lucide-react';
import styles from './VipCheckoutCallback.module.css';

export const VipCheckoutCallback: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');
  const [state, setState] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    if (!reference) {
      setState('failed');
      setMessage('Missing payment reference');
      return;
    }

    let cancelled = false;
    const verify = async () => {
      try {
        const res = await paystackService.verifyPayment(reference);
        if (cancelled) return;
        if (res.ok && res.status === 'success') {
          setState('success');
          setMessage('Payment successful! Welcome to VIP.');
        } else {
          setState('failed');
          setMessage('Payment was not successful. Please try again.');
        }
      } catch (err) {
        if (cancelled) return;
        setState('failed');
        setMessage((err as Error).message || 'Verification failed');
      }
    };
    verify();
    return () => { cancelled = true; };
  }, [reference]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {state === 'verifying' && (
          <>
            <div className={styles.spinner}><Loader size={32} className={styles.spin} /></div>
            <h2 className={styles.title}>Verifying Payment</h2>
            <p className={styles.message}>{message}</p>
          </>
        )}
        {state === 'success' && (
          <>
            <div className={styles.successIcon}><Check size={32} /></div>
            <h2 className={styles.title}>Payment Successful</h2>
            <p className={styles.message}>{message}</p>
            <button className={styles.primary} onClick={() => navigate('/profile/vip')}>
              View VIP Status
            </button>
          </>
        )}
        {state === 'failed' && (
          <>
            <div className={styles.failIcon}><X size={32} /></div>
            <h2 className={styles.title}>Payment Failed</h2>
            <p className={styles.message}>{message}</p>
            <button className={styles.primary} onClick={() => navigate('/profile/vip')}>
              Back to VIP
            </button>
          </>
        )}
      </div>
    </div>
  );
};
