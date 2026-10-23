import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Unlock, User } from 'lucide-react';
import styles from './BlockedUsersPage.module.css';

interface BlockedUser {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  blockedAt: string;
}

export const BlockedUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBlockedUsers = async () => {
      if (!user) return;

      const { data: blocks } = await supabase
        .from('blocks')
        .select('*')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (blocks && blocks.length > 0) {
        const blockedIds = blocks.map((b: any) => b.blocked_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', blockedIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

        setBlockedUsers(
          blocks.map((b: any) => {
            const profile = profileMap.get(b.blocked_id);
            return {
              id: b.id,
              userId: b.blocked_id,
              name: profile?.display_name || 'User',
              avatarUrl: profile?.avatar_url || null,
              blockedAt: b.created_at,
            };
          })
        );
      }

      setLoading(false);
    };

    loadBlockedUsers();
  }, [user]);

  const handleUnblock = async (userId: string) => {
    if (!user) return;
    setError(null);

    try {
      const { error: unblockError } = await supabase.rpc('unblock_user', {
        p_blocked_id: userId,
      });

      if (unblockError) throw unblockError;

      setBlockedUsers((prev) => prev.filter((b) => b.userId !== userId));
    } catch (err: any) {
      setError(err.message || 'Failed to unblock');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading blocked users...</p>
      </div>
    );
  }

  return (
    <div className={styles.blockedPage}>
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>Blocked Users</h1>
      </header>

      <div className={styles.content}>
        {error && (
          <div className={styles.errorBanner}>{error}</div>
        )}

        {blockedUsers.length === 0 ? (
          <div className={styles.emptyState}>
            <User size={40} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No blocked users</p>
            <p className={styles.emptyText}>
              Users you block will appear here. You can unblock them anytime.
            </p>
          </div>
        ) : (
          <div className={styles.blockedList}>
            {blockedUsers.map((blockedUser) => (
              <div key={blockedUser.id} className={styles.blockedItem}>
                <div className={styles.avatar}>
                  {blockedUser.avatarUrl ? (
                    <img src={blockedUser.avatarUrl} alt={blockedUser.name} />
                  ) : (
                    blockedUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className={styles.info}>
                  <span className={styles.name}>{blockedUser.name}</span>
                  <span className={styles.blockedDate}>
                    Blocked on {new Date(blockedUser.blockedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className={styles.unblockButton}
                  onClick={() => handleUnblock(blockedUser.userId)}
                >
                  <Unlock size={16} />
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
