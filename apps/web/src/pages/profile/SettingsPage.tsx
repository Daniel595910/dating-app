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
  const logoUrl = useSettings((s) => s.settings['general.logo_url']) || '/icons/icon-192x192.png';
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
  const [passwordStep, setPasswordStep] = useState<'form' | 'code'>('form');
  const [otpCode, setOtpCode] = useState('');

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

  const closeModal = () => {
    setModal(null);
    setDeleteConfirmText('');
    setNewPassword('');
    setConfirmPassword('');
    setNewEmail('');
    setOtpCode('');
    setPasswordStep('form');
  };

  // Step 1 — validate password + send recovery code to email
  const handleRequestPasswordCode = async () => {
    if (!user?.email) {
      showToast('No email on file', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'warning');
      return;
    }
    setSavingAccount(true);
    const result = await authService.requestPasswordReset(user.email);
    setSavingAccount(false);
    if (!result.success) {
      showToast(result.error || 'Could not send code', 'error');
      return;
    }
    setPasswordStep('code');
    showToast('Code sent to your email', 'success');
  };

  // Step 2 — verify the 8-digit code, then actually change the password
  const handleVerifyPasswordCode = async () => {
    if (!user?.email) return;
    const code = otpCode.trim();
    if (code.length < 4) {
      showToast('Enter the code from your email', 'warning');
      return;
    }
    setSavingAccount(true);
    const verify = await authService.verifyRecoveryOtp(user.email, code);
    if (!verify.success) {
      setSavingAccount(false);
      showToast(verify.error || 'Invalid or expired code', 'error');
      return;
    }
    const update = await authService.updatePassword(newPassword);
    setSavingAccount(false);
    if (!update.success) {
      showToast(update.error || 'Could not update password', 'error');
      return;
    }
    showToast('Password updated successfully', 'success');
    closeModal();
  };

  // Resend the code (if user doesn't receive it)
  const handleResendPasswordCode = async () => {
    if (!user?.email) return;
    setSavingAccount(true);
    const result = await authService.requestPasswordReset(user.email);
    setSavingAccount(false);
    if (!result.success) {
      showToast(result.error || 'Could not resend code', 'error');
      return;
    }
    showToast('New code sent to your email', 'success');
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
          onClick={() => navigate(-1)}
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

        {/* Appearance — theme toggle */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Appearance</h3>
          <div className={styles.group} style={{ padding: '0.875rem 1rem' }}>
            <div className={styles.themeToggleRow}>
              <span className={styles.rowIcon}><Smartphone size={18} /></span>
              <span className={styles.themeToggleLabel}>Theme</span>
            </div>
            <div className={styles.themeSegmented}>
              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className={`${styles.themeSegment} ${theme === mode ? styles.themeSegmentActive : ''}`}
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
              <h2 className={styles.sheetTitle}>
                {passwordStep === 'code' ? 'Enter Code' : 'Change Password'}
              </h2>
              <button className={styles.sheetClose} onClick={closeModal} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className={styles.sheetBody}>
              {!user?.email_confirmed_at ? (
                <div className={styles.verifyRequiredBox}>
                  <div className={styles.verifyRequiredIcon}>
                    <Mail size={24} />
                  </div>
                  <h3 className={styles.verifyRequiredTitle}>Verify your email first</h3>
                  <p className={styles.verifyRequiredText}>
                    For your security, we need to confirm your email before you can change your password.
                    We'll send a confirmation link to <strong>{user?.email}</strong>.
                  </p>
                  <button
                    className={styles.verifyResendButton}
                    onClick={async () => {
                      if (!user?.email) return;
                      const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
                      if (error) {
                        showToast(error.message || 'Could not send verification email', 'error');
                      } else {
                        showToast('Verification email sent — check your inbox', 'success');
                      }
                    }}
                  >
                    Resend verification email
                  </button>
                </div>
              ) : passwordStep === 'form' ? (
                <>
                  <label className={styles.dobLabel}>New password</label>
                  <input
                    type="password"
                    className={styles.dobInput}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoFocus
                  />
                  {newPassword.length > 0 && newPassword.length < 8 && (
                    <p className={styles.fieldHint}>
                      Password is too short ({newPassword.length}/8)
                    </p>
                  )}

                  <label className={styles.dobLabel} style={{ marginTop: '1rem' }}>
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    className={styles.dobInput}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className={styles.fieldHint}>Passwords don't match</p>
                  )}

                  <div className={styles.modalActions}>
                    <button
                      className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      className={`${styles.modalButton} ${styles.modalButtonDanger}`}
                      onClick={handleRequestPasswordCode}
                      disabled={savingAccount}
                    >
                      {savingAccount ? 'Sending…' : 'Change'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.otpHelpText}>
                    We sent an 8-digit code to <strong>{user?.email}</strong>.
                    Enter it below to confirm your password change.
                  </p>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    className={styles.otpInput}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="00000000"
                    autoFocus
                    autoComplete="one-time-code"
                  />

                  <button
                    className={styles.otpResendLink}
                    onClick={handleResendPasswordCode}
                    disabled={savingAccount}
                    type="button"
                  >
                    Didn't receive a code? Resend
                  </button>

                  <div className={styles.modalActions}>
                    <button
                      className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                      onClick={() => { setPasswordStep('form'); setOtpCode(''); }}
                    >
                      Back
                    </button>
                    <button
                      className={`${styles.modalButton} ${styles.modalButtonDanger}`}
                      onClick={handleVerifyPasswordCode}
                      disabled={savingAccount || otpCode.length < 4}
                    >
                      {savingAccount ? 'Verifying…' : 'Verify'}
                    </button>
                  </div>
                </>
              )}
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
              <div className={styles.emailCurrentBox}>
                <div className={styles.emailCurrentIcon}>
                  <Mail size={18} />
                </div>
                <div className={styles.emailCurrentBody}>
                  <p className={styles.emailCurrentLabel}>Current email</p>
                  <p className={styles.emailCurrentValue}>{user?.email}</p>
                </div>
              </div>

              <label className={styles.dobLabel}>New email address</label>
              <input
                type="email"
                className={styles.dobInput}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
              />

              <p className={styles.emailHint}>
                <Shield size={13} />
                <span>
                  We'll send a confirmation link to your new address. Your email won't change until you confirm.
                </span>
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
              <p className={styles.dobIntro}>
                Used to calculate your age on your profile. This is not shown publicly.
              </p>
              <label className={styles.dobLabel}>Your birthday</label>
              <input
                type="date"
                className={styles.dobInput}
                value={newDob}
                onChange={(e) => setNewDob(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
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
              <h4 className={styles.privacySectionLabel}>Visibility</h4>
              <div className={styles.privacyGroup}>
                <div className={styles.privacyRow}>
                  <span className={styles.privacyRowIcon}><Eye size={18} /></span>
                  <div className={styles.privacyRowBody}>
                    <span className={styles.privacyRowTitle}>Show my activity</span>
                    <span className={styles.privacyRowSubtitle}>
                      Let others see your posts and reactions
                    </span>
                  </div>
                  <button
                    className={`${styles.toggle} ${showActivity ? styles.toggleOn : ''}`}
                    onClick={() => { const next = !showActivity; setShowActivity(next); savePrivacySetting('show_activity', next); }}
                    aria-label="Toggle activity visibility"
                  >
                    <span className={`${styles.toggleThumb} ${showActivity ? styles.toggleThumbOn : ''}`} />
                  </button>
                </div>

                <div className={styles.privacyRow}>
                  <span className={styles.privacyRowIcon}><MessageSquare size={18} /></span>
                  <div className={styles.privacyRowBody}>
                    <span className={styles.privacyRowTitle}>Allow messages</span>
                    <span className={styles.privacyRowSubtitle}>
                      Let members of your communities message you
                    </span>
                  </div>
                  <button
                    className={`${styles.toggle} ${allowMessages ? styles.toggleOn : ''}`}
                    onClick={() => { const next = !allowMessages; setAllowMessages(next); savePrivacySetting('allow_messages', next); }}
                    aria-label="Toggle messages"
                  >
                    <span className={`${styles.toggleThumb} ${allowMessages ? styles.toggleThumbOn : ''}`} />
                  </button>
                </div>

                <div className={styles.privacyRow}>
                  <span className={styles.privacyRowIcon}><Globe size={18} /></span>
                  <div className={styles.privacyRowBody}>
                    <span className={styles.privacyRowTitle}>Discoverable profile</span>
                    <span className={styles.privacyRowSubtitle}>
                      Appear in Discover and search results
                    </span>
                  </div>
                  <button
                    className={`${styles.toggle} ${discoverable ? styles.toggleOn : ''}`}
                    onClick={() => { const next = !discoverable; setDiscoverable(next); savePrivacySetting('is_discoverable', next); }}
                    aria-label="Toggle discoverability"
                  >
                    <span className={`${styles.toggleThumb} ${discoverable ? styles.toggleThumbOn : ''}`} />
                  </button>
                </div>
              </div>

              <h4 className={styles.privacySectionLabel}>Shortcuts</h4>
              <div className={styles.privacyGroup}>
                <button
                  className={styles.privacyActionRow}
                  onClick={() => { closeModal(); navigate('/settings/blocked-users'); }}
                >
                  <Ban size={18} />
                  <span className={styles.privacyActionLabel}>Blocked Users</span>
                  <ChevronRight size={16} className={styles.privacyActionChevron} />
                </button>

                <button
                  className={styles.privacyActionRow}
                  onClick={() => { closeModal(); navigate('/settings/notifications'); }}
                >
                  <Bell size={18} />
                  <span className={styles.privacyActionLabel}>Notification Preferences</span>
                  <ChevronRight size={16} className={styles.privacyActionChevron} />
                </button>
              </div>
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
              <div className={styles.helpIntro}>
                <div className={styles.helpIntroIcon}>
                  <HelpCircle size={24} />
                </div>
                <h3 className={styles.helpIntroTitle}>Need a hand?</h3>
                <p className={styles.helpIntroText}>
                  Email us directly at{' '}
                  <a href="mailto:support@spensive.me" className={styles.helpIntroLink}>
                    support@spensive.me
                  </a>
                  {' '}— we usually reply within 24 hours. You can also check the community
                  guidelines for rules and safety tips.
                </p>
              </div>

              <button
                className={styles.helpRow}
                onClick={() => navigate('/community-guidelines')}
              >
                <span className={styles.helpRowIcon}><FileText size={18} /></span>
                <span className={styles.helpRowBody}>
                  <span className={styles.helpRowTitle}>Community Guidelines</span>
                  <span className={styles.helpRowSubtitle}>Rules, safety tips, and community standards</span>
                </span>
                <ChevronRight size={16} className={styles.helpRowChevron} />
              </button>

              <a
                href="mailto:support@spensive.me?subject=Dating%20App%20Support%20Request&body=Hi%20team%2C%0A%0AI%20need%20help%20with%3A%0A%0A"
                className={styles.helpRow}
              >
                <span className={styles.helpRowIcon}><Mail size={18} /></span>
                <span className={styles.helpRowBody}>
                  <span className={styles.helpRowTitle}>Email Support</span>
                  <span className={styles.helpRowSubtitle}>support@spensive.me</span>
                </span>
                <ChevronRight size={16} className={styles.helpRowChevron} />
              </a>

              <button
                className={styles.helpRow}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText('support@spensive.me');
                    showToast('Email copied to clipboard', 'success');
                  } catch {
                    showToast('support@spensive.me', 'info');
                  }
                }}
              >
                <span className={styles.helpRowIcon}><CopyIcon size={18} /></span>
                <span className={styles.helpRowBody}>
                  <span className={styles.helpRowTitle}>Copy email address</span>
                  <span className={styles.helpRowSubtitle}>Save it for later</span>
                </span>
              </button>

              <button
                className={styles.helpRow}
                onClick={() => setModal('privacy')}
              >
                <span className={styles.helpRowIcon}><Shield size={18} /></span>
                <span className={styles.helpRowBody}>
                  <span className={styles.helpRowTitle}>Report a Safety Issue</span>
                  <span className={styles.helpRowSubtitle}>Tell us about anything unsafe</span>
                </span>
                <ChevronRight size={16} className={styles.helpRowChevron} />
              </button>
            </div>
          </div>
        </div>
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
              <div className={styles.aboutBrand}>
                <div className={styles.aboutIconWrapper}>
                  <img
                    src={logoUrl}
                    alt={appName}
                    className={styles.aboutIconImage}
                  />
                </div>
                <h3 className={styles.aboutAppName}>{appName}</h3>
                <p className={styles.aboutVersion}>Version 1.0.0</p>
              </div>

              <button
                className={styles.helpRow}
                onClick={() => window.open('https://spensive.me/terms', '_blank', 'noopener')}
              >
                <span className={styles.helpRowIcon}><FileText size={18} /></span>
                <span className={styles.helpRowBody}>
                  <span className={styles.helpRowTitle}>Terms of Service</span>
                  <span className={styles.helpRowSubtitle}>Read the terms</span>
                </span>
                <ChevronRight size={16} className={styles.helpRowChevron} />
              </button>

              <button
                className={styles.helpRow}
                onClick={() => window.open('https://spensive.me/privacy', '_blank', 'noopener')}
              >
                <span className={styles.helpRowIcon}><Shield size={18} /></span>
                <span className={styles.helpRowBody}>
                  <span className={styles.helpRowTitle}>Privacy Policy</span>
                  <span className={styles.helpRowSubtitle}>How we protect your data</span>
                </span>
                <ChevronRight size={16} className={styles.helpRowChevron} />
              </button>

              <button
                className={styles.helpRow}
                onClick={() => window.open('https://spensive.me/permissions', '_blank', 'noopener')}
              >
                <span className={styles.helpRowIcon}><Smartphone size={18} /></span>
                <span className={styles.helpRowBody}>
                  <span className={styles.helpRowTitle}>App Permissions</span>
                  <span className={styles.helpRowSubtitle}>What we access and why</span>
                </span>
                <ChevronRight size={16} className={styles.helpRowChevron} />
              </button>

              <h4 className={styles.aboutSectionLabel}>Help & Support</h4>

              <a
                className={styles.helpRow}
                href={'mailto:' + supportEmail}
              >
                <span className={styles.helpRowIcon}><Mail size={18} /></span>
                <span className={styles.helpRowBody}>
                  <span className={styles.helpRowTitle}>Contact Support</span>
                  <span className={styles.helpRowSubtitle}>{supportEmail}</span>
                </span>
                <ChevronRight size={16} className={styles.helpRowChevron} />
              </a>

              <a
                className={styles.helpRow}
                href={'mailto:' + supportEmail + '?subject=Feedback%20for%20' + encodeURIComponent(appName)}
              >
                <span className={styles.helpRowIcon}><MessageSquare size={18} /></span>
                <span className={styles.helpRowBody}>
                  <span className={styles.helpRowTitle}>Send Feedback</span>
                  <span className={styles.helpRowSubtitle}>Help us improve {appName}</span>
                </span>
                <ChevronRight size={16} className={styles.helpRowChevron} />
              </a>

              <p className={styles.aboutFooter}>
                © {new Date().getFullYear()} {appName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LOCATION SETUP MODAL */}
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
    </div>
  );
};
