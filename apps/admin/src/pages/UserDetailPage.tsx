import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  Crown,
  BadgeCheck,
  Ban,
  Mail,
  Send,
  FileText,
  Heart,
  Flag,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { userService, AdminUserRecord } from '@/services/user.service';
import styles from './UserDetailPage.module.css';

interface EmailStatus {
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [user, setUser] = useState<AdminUserRecord | null>(null);
  const [stats, setStats] = useState({ posts: 0, matches: 0, reports: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'ban' | 'unban' | 'verify' | 'unverify' | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadUser = async () => {
      setLoading(true);
      const userData = await userService.getUserById(id);
      setUser(userData);

      if (userData) {
        const userStats = await userService.getUserStats(id);
        setStats(userStats);

        // Batch-fetch email confirmation status via edge function
        userService
          .getEmailStatuses([userData.user_id])
          .then((statuses) => {
            setEmailStatus(statuses[userData.user_id] ?? null);
          })
          .catch((err) => console.error('getEmailStatuses failed:', err));
      }
      setLoading(false);
    };

    loadUser();
  }, [id]);

  const handleVerify = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await userService.verifyUser(user.user_id, !user.is_verified);
      setUser({ ...user, is_verified: !user.is_verified });
      toast.success(user.is_verified ? 'User unverified' : 'User verified');
    } catch (err: any) {
      toast.error('Action failed', err.message);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!user) return;
    if (!hasPermission('USER_VERIFY')) {
      toast.error('Permission denied', 'You cannot send verification emails');
      return;
    }

    setSendingEmail(true);
    try {
      const result = await userService.sendVerificationEmail(user.user_id);
      if (result.success) {
        toast.success('Verification email sent');
      } else {
        toast.error('Failed to send', result.error || 'Unknown error');
      }
    } catch (err: any) {
      toast.error('Action failed', err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <Loader fullScreen text="Loading user..." />;
  if (!user) {
    return (
      <div className={styles.container}>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/users')}>
          Back to Users
        </Button>
        <div className={styles.notFound}>
          <h2>User not found</h2>
          <p>This user may have been deleted.</p>
        </div>
      </div>
    );
  }

  const emailUnconfirmed = emailStatus && !emailStatus.email_confirmed_at;

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={() => navigate('/users')}>
        <ArrowLeft size={16} />
        Back to Users
      </button>

      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <Avatar src={user.avatar_url} name={user.display_name || 'User'} size="xl" />
        <div className={styles.profileInfo}>
          <div className={styles.nameRow}>
            <h1 className={styles.userName}>{user.display_name || 'Unnamed User'}</h1>
            {user.is_verified && <BadgeCheck size={20} className={styles.verifiedIcon} />}
            {user.is_vip && <Badge variant="warning" size="sm"><Crown size={10} /> VIP</Badge>}
            {user.is_admin && <Badge variant="error" size="sm"><Shield size={10} /> {user.role}</Badge>}
            {emailUnconfirmed && (
              <Badge variant="warning" size="sm">
                <Mail size={10} /> Email unverified
              </Badge>
            )}
          </div>
          <p className={styles.userId}>ID: {user.user_id}</p>
          {emailStatus?.email && (
            <p className={styles.userId}>Email: {emailStatus.email}</p>
          )}
          {user.bio && <p className={styles.bio}>{user.bio}</p>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        {hasPermission('USER_VERIFY') && (
          <Button
            variant={user.is_verified ? 'secondary' : 'primary'}
            icon={user.is_verified ? <ShieldCheck size={16} /> : <BadgeCheck size={16} />}
            onClick={() => setConfirmAction(user.is_verified ? 'unverify' : 'verify')}
            loading={actionLoading && confirmAction === (user.is_verified ? 'unverify' : 'verify')}
          >
            {user.is_verified ? 'Unverify User' : 'Verify User'}
          </Button>
        )}
        {hasPermission('USER_VERIFY') && emailUnconfirmed && (
          <Button
            variant="primary"
            icon={<Send size={16} />}
            onClick={handleSendVerificationEmail}
            loading={sendingEmail}
          >
            Send verification email
          </Button>
        )}
        {hasPermission('USER_BAN') && (
          <Button
            variant="danger"
            icon={<Ban size={16} />}
            onClick={() => setConfirmAction('ban')}
          >
            Ban User
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <Card>
          <div className={styles.statContent}>
            <FileText size={20} className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>Posts</p>
              <p className={styles.statValue}>{stats.posts}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className={styles.statContent}>
            <Heart size={20} className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>Matches</p>
              <p className={styles.statValue}>{stats.matches}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className={styles.statContent}>
            <Flag size={20} className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>Reports</p>
              <p className={styles.statValue}>{stats.reports}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Details Card */}
      <Card title="Account Details">
        <div className={styles.detailsGrid}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Member since</span>
            <span className={styles.detailValue}>
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Last updated</span>
            <span className={styles.detailValue}>
              {new Date(user.updated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Role</span>
            <span className={styles.detailValue}>{user.role || 'user'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Gender</span>
            <span className={styles.detailValue}>{user.gender || 'Not specified'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Email status</span>
            <span className={styles.detailValue}>
              {emailStatus
                ? emailStatus.email_confirmed_at
                  ? `Confirmed ${new Date(emailStatus.email_confirmed_at).toLocaleDateString()}`
                  : 'Not confirmed'
                : 'Loading…'}
            </span>
          </div>
          {user.birth_date && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Birth date</span>
              <span className={styles.detailValue}>
                {new Date(user.birth_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmAction === 'verify'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleVerify}
        title="Verify user?"
        description={`This will add a verified badge to ${user.display_name}'s profile.`}
        confirmText="Verify"
        variant="info"
      />

      <ConfirmDialog
        open={confirmAction === 'unverify'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleVerify}
        title="Unverify user?"
        description={`This will remove the verified badge from ${user.display_name}'s profile.`}
        confirmText="Unverify"
        variant="warning"
      />

      <ConfirmDialog
        open={confirmAction === 'ban'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          toast.info('Ban feature', 'Coming soon');
          setConfirmAction(null);
        }}
        title="Ban this user?"
        description={`This will permanently prevent ${user.display_name} from accessing the platform.`}
        confirmText="Ban User"
        variant="danger"
        requireTyping="BAN"
      />
    </div>
  );
};