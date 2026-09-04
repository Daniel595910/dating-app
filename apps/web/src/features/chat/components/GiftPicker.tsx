import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/GiftPicker.module.css';

interface GiftPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectGift: (gift: { id: string; name: string; icon: string }) => void;
}

interface GiftItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price_units: number;
}

export const GiftPicker: React.FC<GiftPickerProps> = ({ open, onClose, onSelectGift }) => {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchGifts = async () => {
        setLoading(true);
        const { data } = await supabase
          .from('gift_catalog')
          .select('*')
          .eq('enabled', true)
          .order('sort_order', { ascending: true });

        setGifts(data || []);
        setLoading(false);
      };

      fetchGifts();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <h3 className={styles.title}>Send a Gift</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading gifts...</p>
        ) : (
          <div className={styles.giftGrid}>
            {gifts.map((gift) => (
              <button
                key={gift.id}
                className={styles.giftItem}
                onClick={() => {
                  onSelectGift({ id: gift.id, name: gift.name, icon: gift.icon });
                  onClose();
                }}
              >
                <span className={styles.giftIcon}>{gift.icon}</span>
                <span className={styles.giftName}>{gift.name}</span>
                {gift.price_units > 0 ? (
                  <span className={styles.giftPrice}>{gift.price_units} pts</span>
                ) : (
                  <span className={styles.giftFree}>Free</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
