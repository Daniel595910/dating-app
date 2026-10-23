import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { supabase } from '@/config/supabase.client';
import { authService } from '@/services/auth.service';
import {
  ArrowLeft, ChevronRight, User, Bell, Lock, MapPin, Ban,
  HelpCircle, Info, LogOut, Trash2, X, Shield, Eye, MessageSquare, Copy as CopyIcon,
  Globe, FileText, Mail, Smartphone, Key, Calendar, Share2,
} from 'lucide-react';
import styles from './SettingsPage.module.css';
import { LocationSetupSheet } from '@/features/community/components/LocationSetupSheet';
import { useThemeStore, ThemeMode } from '@/store/theme.store';
import { useSettings } from '@/hooks/useSettings';

type ModalType =
  | 'location'
  | 'logout'
  | 'delete'
  | 'privacy'
  | 'help'
  | 'about'
  | 'password'
  | 'email'
  | 'dob'
  | null;

interface SettingItem {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value?: string;
  action: () => void;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const showToast = useUIStore((state) => state.showToast);
  const { theme, setTheme } = useThemeStore();
  const appName = useSettings((s) => s.settings['general.app_name']) || 'Spensive';
  const supportEmail = useSettings((s) => s.settings['general.support_email']) || 'support@spensive.me';
  const [modal, setModal] = useState<ModalType>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Privacy toggles
  const [showActivity, setShowActivity] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [discoverable, setDiscoverable] = useState(true);

  // Location display
  const [locationLabel, setLocationLabel] = useState('Set your location');

  // Account & Security state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDob, setNewDob] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('location, show_activity, allow_messages, is_discoverable, birth_date')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        if (data.location) {
          const parts = [data.location.city, data.location.state, data.location.country].filter(Boolean);
          if (parts.length > 0) setLocationLabel(parts.join(', '));
        }
        setShowActivity(data.show_activity !== false);
        setAllowMessages(data.allow_messages !== false);
        setDiscoverable(data.is_discoverable !== false);
        if (data.birth_date) setNewDob(String(data.birth_date).slice(0, 10));
      }
    })();
  }, [user]);

  const savePrivacySetting = async (
    key: 'show_activity' | 'allow_messages' | 'is_discoverable',
    value: boolean,
  ) => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ [key]: value })
      .eq('user_id', user.id);
  };

  const handleShareProfile = async () => {
    if (!user) return;
      const url = `${window.location.origin}/profile/${user.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Find me on ${appName}`, url });
        return;
      } catch {
        // user cancelled share, fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Profile link copied', 'success');
    } catch {
      showToast(url, 'info');
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await supabase
        .from('profiles')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          is_banned: true,
          ban_reason: 'Account deleted by user',
          banned_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      await logout();
      navigate('/login');
    } finally {
      setDeleting(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'warning');
      return;
    }
    setSavingAccount(true);
    const result = await authService.updatePassword(newPassword);
    setSavingAccount(false);
    if (!result.success) {
      showToast(result.error || 'Could not update password', 'error');
      return;
    }
    showToast('Password updated', 'success');
    setNewPassword('');
    setConfirmPassword('');
    closeModal();
  };

  const handleChangeEmail = async () => {
    const email = newEmail.trim();
    if (!email || !email.includes('@')) {
      showToast('Enter a valid email', 'warning');
      return;
    }
    if (email === user?.email) {
      showToast('That is already your email', 'info');
      return;
    }
    setSavingAccount(true);
    const result = await authService.updateEmail(email);
    setSavingAccount(false);
    if (!result.success) {
      showToast(result.error || 'Could not update email', 'error');
      return;
    }
    showToast('Confirmation sent — check both inboxes to finish the change', 'success', 7000);
    setNewEmail('');
    closeModal();
  };

  const handleChangeDob = async () => {
    if (!newDob) {
      showToast('Pick a date', 'warning');
      return;
    }
    if (!user) return;
    setSavingAccount(true);
    const { error } = await supabase
      .from('profiles')
      .update({ birth_date: newDob })
      .eq('user_id', user.id);
    setSavingAccount(false);
    if (error) {
      showToast(error.message || 'Could not update date of birth', 'error');
      return;
    }
    showToast('Date of birth updated', 'success');
    closeModal();
  };

  const closeModal = () => {
    setModal(null);
    setDeleteConfirmText('');
    setNewPassword('');
    setConfirmPassword('');
    setNewEmail('');
  };

  const settingsSections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Edit Profile', action: () => navigate('/profile/edit') },
        { icon: User, label: 'Dating Preferences', action: () => navigate('/profile/preferences') },
        { icon: Shield, label: 'Verify Your Identity', action: () => navigate('/profile/verify') },
      ],
    },
    {
      title: 'Share',
      items: [
        { icon: Share2, label: 'Share your profile', action: handleShareProfile },
      ],
    },
    {
      title: 'Account & Security',
      items: [
        { icon: Key, label: 'Change Password', action: () => setModal('password') },
        { icon: Mail, label: 'Change Email', value: user?.email || '', action: () => setModal('email') },
        { icon: Calendar, label: 'Date of Birth', action: () => setModal('dob') },
      ],
    },
    {
      title: 'Privacy & Safety',
      items: [
        { icon: Lock, label: 'Privacy Settings', action: () => setModal('privacy') },
        { icon: Ban, label: 'Blocked Users', action: () => navigate('/settings/blocked-users') },
        { icon: MapPin, label: 'Location Settings', value: locationLabel, action: () => setModal('location') },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { icon: Bell, label: 'Notification Preferences', action: () => navigate('/settings/notifications') },
      ],
    },
    {
      title: 'Appearance',
      items: [],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & Support', action: () => setModal('help') },
        { icon: Info, label: 'About', action: () => setModal('about') },
      ],
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.headerButton}
          onClick={() => navigate('/profile')}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>Settings</h1>
      </header>

      <div className={styles.content}>
        {settingsSections.map((section) => (
          <div key={section.title} className={styles.section}>
            <h3 className={styles.sectionTitle}>{section.title}</h3>
            <div className={styles.group}>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    className={styles.row}
                    onClick={item.action}
                  >
                    <span className={styles.rowIcon}>
                      <Icon size={18} />
                    </span>
                    <span className={styles.rowLabel}>{item.label}</span>
                    {item.value && <span className={styles.rowValue}>{item.value}</span>}
                    <ChevronRight size={16} className={styles.rowChevron} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Appearance â€” theme toggle */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Appearance</h3>
          <div className={styles.group} style={{ padding: '0.875rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span className={styles.rowIcon}><Smartphone size={18} /></span>
              <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
                Theme
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    background: theme === mode ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                    color: theme === mode ? '#ffffff' : 'var(--color-text-secondary)',
                    border: theme === mode ? 'none' : '1px solid var(--color-border-strong)',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    minHeight: 38,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Logout + Delete Account */}
        <div className={styles.section}>
          <div className={styles.group}>
            <button
              className={styles.row}
              onClick={() => setModal('logout')}
            >
              <span className={styles.rowIcon}>
                <LogOut size={18} />
              </span>
              <span className={styles.rowLabel}>Logout</span>
            </button>
            <button
              className={`${styles.row} ${styles.destructiveRow}`}
              onClick={() => setModal('delete')}
            >
              <span className={styles.rowIcon}>
                <Trash2 size={18} />
              </span>
              <span className={styles.rowLabel}>Delete Account</span>
              <ChevronRight size={16} className={styles.rowChevron} />
            </button>
          </div>
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {modal === 'password' && (
        <div className={`${styles.modalOverlay} ${styles.modalOverlayBottom}`} onClick={closeModal}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>Change Password</h2>
              <button className={styles.sheetClose} onClick={closeModal} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className={styles.sheetBody}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>
                New password
              </label>
              <input
                type="password"
                className={styles.modalInput}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
              />
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, margin: '1rem 0 6px', color: 'var(--color-text)' }}>
                Confirm new password
              </label>
              <input
                type="password"
                className={styles.modalInput}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
              <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
                <button
                  className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.modalButton} ${styles.modalButtonDanger}`}
                  onClick={handleChangePassword}
                  disabled={savingAccount}
                >
                  {savingAccount ? 'Saving…' : 'Change'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE EMAIL MODAL */}
      {modal === 'email' && (
        <div className={`${styles.modalOverlay} ${styles.modalOverlayBottom}`} onClick={closeModal}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>Change Email</h2>
              <button className={styles.sheetClose} onClick={closeModal} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className={styles.sheetBody}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                Current: <strong>{user?.email}</strong>
              </p>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>
                New email
              </label>
              <input
                type="email"
                className={styles.modalInput}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.75rem' }}>
                Supabase will send a confirmation email. The change only takes effect after you confirm.
              </p>
              <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
                <button
                  className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.modalButton} ${styles.modalButtonDanger}`}
                  onClick={handleChangeEmail}
                  disabled={savingAccount}
                >
                  {savingAccount ? 'Sending…' : 'Send confirmation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE DOB MODAL */}
      {modal === 'dob' && (
        <div className={`${styles.modalOverlay} ${styles.modalOverlayBottom}`} onClick={closeModal}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>Date of Birth</h2>
              <button className={styles.sheetClose} onClick={closeModal} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className={styles.sheetBody}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                Used to calculate your age on your profile.
              </p>
              <input
                type="date"
                className={styles.modalInput}
                value={newDob}
                onChange={(e) => setNewDob(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
              <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
                <button
                  className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.modalButton} ${styles.modalButtonDanger}`}
                  onClick={handleChangeDob}
                  disabled={savingAccount}
                >
                  {savingAccount ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT MODAL */}
      {modal === 'logout' && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.modalIconWrap} ${styles.modalIconNeutral}`}>
              <LogOut size={26} />
            </div>
            <h3 className={styles.modalTitle}>Logout?</h3>
            <p className={styles.modalText}>
              You&apos;ll need to sign in again to access your account.
            </p>
            <div className={styles.modalActions}>
              <button
                className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className={`${styles.modalButton} ${styles.modalButtonDanger}`}
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT MODAL */}
      {modal === 'delete' && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.modalIconWrap} ${styles.modalIconDanger}`}>
              <Trash2 size={26} />
            </div>
            <h3 className={styles.modalTitle}>Delete Account?</h3>
            <p className={styles.modalText}>
              This action cannot be undone. Your profile, posts, connections, and messages will be permanently removed.
            </p>
            <p className={styles.modalInputHint}>
              Type <strong>DELETE</strong> to confirm
            </p>
            <input
              className={styles.modalInput}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className={styles.modalActions}>
              <button
                className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className={`${styles.modalButton} ${styles.modalButtonDanger}`}
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
              >
                {deleting ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRIVACY & SAFETY MODAL */}
      {modal === 'privacy' && (
        <div className={`${styles.modalOverlay} ${styles.modalOverlayBottom}`} onClick={closeModal}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>Privacy & Safety</h2>
              <button className={styles.sheetClose} onClick={closeModal} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className={styles.sheetBody}>
              <div className={styles.group} style={{ margin: '0 0 1rem' }}>
                <div className={styles.row} style={{ cursor: 'default' }}>
                  <span className={styles.rowIcon}><Eye size={18} /></span>
                  <span className={styles.rowLabel}>
                    Show my activity
                    <br />
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 400 }}>
                      Let others see your posts and reactions
                    </small>
                  </span>
                  <button
                    className={`${styles.toggle} ${showActivity ? styles.toggleOn : ''}`}
                    onClick={() => { const next = !showActivity; setShowActivity(next); savePrivacySetting('show_activity', next); }}
                    aria-label="Toggle activity visibility"
                  >
                    <span className={`${styles.toggleThumb} ${showActivity ? styles.toggleThumbOn : ''}`} />
                  </button>
                </div>

                <div className={styles.row} style={{ cursor: 'default' }}>
                  <span className={styles.rowIcon}><MessageSquare size={18} /></span>
                  <span className={styles.rowLabel}>
                    Allow messages
                    <br />
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 400 }}>
                      Let members of your communities message you
                    </small>
                  </span>
                  <button
                    className={`${styles.toggle} ${allowMessages ? styles.toggleOn : ''}`}
                    onClick={() => { const next = !allowMessages; setAllowMessages(next); savePrivacySetting('allow_messages', next); }}
                    aria-label="Toggle messages"
                  >
                    <span className={`${styles.toggleThumb} ${allowMessages ? styles.toggleThumbOn : ''}`} />
                  </button>
                </div>

                <div className={styles.row} style={{ cursor: 'default' }}>
                  <span className={styles.rowIcon}><Globe size={18} /></span>
                  <span className={styles.rowLabel}>
                    Discoverable profile
                    <br />
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 400 }}>
                      Appear in Discover and search results
                    </small>
                  </span>
                  <button
                    className={`${styles.toggle} ${discoverable ? styles.toggleOn : ''}`}
                    onClick={() => { const next = !discoverable; setDiscoverable(next); savePrivacySetting('is_discoverable', next); }}
                    aria-label="Toggle discoverability"
                  >
                    <span className={`${styles.toggleThumb} ${discoverable ? styles.toggleThumbOn : ''}`} />
                  </button>
                </div>
              </div>

              <button
                className={styles.row}
                onClick={() => { closeModal(); navigate('/settings/blocked-users'); }}
                style={{ background: '#ffffff', borderRadius: '1rem', marginBottom: '1rem' }}
              >
                <span className={styles.rowIcon}><Ban size={18} /></span>
                <span className={styles.rowLabel}>Blocked Users</span>
                <ChevronRight size={16} className={styles.rowChevron} />
              </button>

              <button
                className={styles.row}
                onClick={() => { closeModal(); navigate('/settings/notifications'); }}
                style={{ background: '#ffffff', borderRadius: '1rem' }}
              >
                <span className={styles.rowIcon}><Bell size={18} /></span>
                <span className={styles.rowLabel}>Notification Preferences</span>
                <ChevronRight size={16} className={styles.rowChevron} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELP & SUPPORT MODAL */}
      {modal === 'help' && (
        <div className={`${styles.modalOverlay} ${styles.modalOverlayBottom}`} onClick={closeModal}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>Help & Support</h2>
              <button className={styles.sheetClose} onClick={closeModal} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className={styles.sheetBody}>
              <p><strong>Need a hand?</strong></p>
              <p style={{ marginBottom: '1rem' }}>
                Email us directly at{' '}
                <a
                  href="mailto:support@spensive.me"
                  style={{ color: '#ef4444', fontWeight: 600, textDecoration: 'none' }}
                >
                  support@spensive.me
                </a>
                {' '}â€” we usually reply within 24 hours. You can also check the
                community guidelines for rules and safety tips.
              </p>

              <button
                className={styles.row}
                onClick={() => navigate('/community-guidelines')}
                style={{ background: '#f9fafb', borderRadius: '1rem', marginBottom: '0.75rem' }}
              >
                <span className={styles.rowIcon}><FileText size={18} /></span>
                <span className={styles.rowLabel}>Community Guidelines</span>
                <ChevronRight size={16} className={styles.rowChevron} />
              </button>

              <a
                href="mailto:support@spensive.me?subject=Dating%20App%20Support%20Request&body=Hi%20team%2C%0A%0AI%20need%20help%20with%3A%0A%0A"
                className={styles.row}
                style={{ background: '#f9fafb', borderRadius: '1rem', marginBottom: '0.75rem', textDecoration: 'none' }}
              >
                <span className={styles.rowIcon}><Mail size={18} /></span>
                <span className={styles.rowLabel}>
                  Email Support
                  <br />
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400 }}>
                    support@spensive.me
                  </span>
                </span>
                <ChevronRight size={16} className={styles.rowChevron} />
              </a>

              <button
                className={styles.row}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText('support@spensive.me');
                    showToast('Email copied to clipboard', 'success');
                  } catch {
                    showToast('support@spensive.me', 'info');
                  }
                }}
                style={{ background: '#f9fafb', borderRadius: '1rem', marginBottom: '0.75rem' }}
              >
                <span className={styles.rowIcon}><CopyIcon size={18} /></span>
                <span className={styles.rowLabel}>Copy email address</span>
              </button>

              <button
                className={styles.row}
                onClick={() => setModal('privacy')}
                style={{ background: '#f9fafb', borderRadius: '1rem' }}
              >
                <span className={styles.rowIcon}><Shield size={18} /></span>
                <span className={styles.rowLabel}>Report a Safety Issue</span>
                <ChevronRight size={16} className={styles.rowChevron} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCATION MODAL */}
      {modal === 'location' && (
        <LocationSetupSheet
          open={true}
          onClose={closeModal}
          userId={user?.id || ''}
          onLocationSaved={() => {
            closeModal();
            window.location.reload();
          }}
        />
      )}

      {/* ABOUT MODAL */}
      {modal === 'about' && (
        <div className={`${styles.modalOverlay} ${styles.modalOverlayBottom}`} onClick={closeModal}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>About</h2>
              <button className={styles.sheetClose} onClick={closeModal} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className={styles.sheetBody}>
              <div style={{ textAlign: 'center', padding: '1rem 0 1.5rem' }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    margin: '0 auto 0.875rem',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  D
                </div>
                <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#111827', margin: '0 0 0.25rem' }}>
                  Dating App
                </p>
                <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: 0 }}>
                  Version 1.0.0
                </p>
              </div>

              <button
                className={styles.row}
                onClick={() => window.open('https://spensive.me/terms', '_blank', 'noopener')}
                style={{ background: '#f9fafb', borderRadius: '1rem', marginBottom: '0.75rem' }}
              >
                <span className={styles.rowIcon}><FileText size={18} /></span>
                <span className={styles.rowLabel}>Terms of Service</span>
                <ChevronRight size={16} className={styles.rowChevron} />
              </button>

              <button
                className={styles.row}
                onClick={() => window.open('https://spensive.me/privacy', '_blank', 'noopener')}
                style={{ background: '#f9fafb', borderRadius: '1rem', marginBottom: '0.75rem' }}
              >
                <span className={styles.rowIcon}><Shield size={18} /></span>
                <span className={styles.rowLabel}>Privacy Policy</span>
                <ChevronRight size={16} className={styles.rowChevron} />
              </button>

              <button
                className={styles.row}
                onClick={() => window.open('https://spensive.me/permissions', '_blank', 'noopener')}
                style={{ background: '#f9fafb', borderRadius: '1rem' }}
              >
                <span className={styles.rowIcon}><Smartphone size={18} /></span>
                <span className={styles.rowLabel}>App Permissions</span>
                <ChevronRight size={16} className={styles.rowChevron} />
              </button>

              {/* Help & Support */}
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '1.5rem 0 0.5rem' }}>
                Help & Support
              </p>

              <a
                className={styles.row}
                href={'mailto:' + supportEmail}
                style={{ background: '#f9fafb', borderRadius: '1rem', textDecoration: 'none', marginBottom: '0.75rem' }}
              >
                <span className={styles.rowIcon}><Mail size={18} /></span>
                <span className={styles.rowLabel}>Contact Support</span>
                <ChevronRight size={16} className={styles.rowChevron} />
              </a>

              <a
                className={styles.row}
                href={'mailto:' + supportEmail + '?subject=Feedback%20for%20' + encodeURIComponent(appName)}
                style={{ background: '#f9fafb', borderRadius: '1rem', textDecoration: 'none', marginBottom: '0.75rem' }}
              >
                <span className={styles.rowIcon}><MessageSquare size={18} /></span>
                <span className={styles.rowLabel}>Send Feedback</span>
                <ChevronRight size={16} className={styles.rowChevron} />
              </a>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: '1.5rem' }}>
                © {new Date().getFullYear()} {appName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
