import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, ChevronRight, User, Bell, Lock, MapPin, Ban, HelpCircle, Info, LogOut, Trash2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    // Soft delete - set status to deleted
    await supabase
      .from('users')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('id', user.id);

    await logout();
    navigate('/login');
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Edit Profile', action: () => navigate('/profile/edit') },
        { icon: User, label: 'Dating Preferences', action: () => navigate('/profile/preferences') },
      ],
    },
    {
      title: 'Privacy & Safety',
      items: [
        { icon: Lock, label: 'Privacy Settings', action: () => {} },
        { icon: Ban, label: 'Blocked Users', action: () => navigate('/settings/blocked-users') },
        { icon: MapPin, label: 'Location Settings', action: () => navigate('/location') },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { icon: Bell, label: 'Notification Preferences', action: () => {} },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & Support', action: () => {} },
        { icon: Info, label: 'About', action: () => {} },
      ],
    },
  ];

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#faf9f7',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.625rem 0.75rem',
        paddingTop: 'calc(0.625rem + env(safe-area-inset-top))',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f3f4f6',
      }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111827', padding: '0.5rem', borderRadius: '9999px', minWidth: 44, minHeight: 44 }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Settings</h1>
      </header>

      <div style={{ padding: '1rem 0' }}>
        {settingsSections.map((section) => (
          <div key={section.title} style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 1rem 0.5rem' }}>
              {section.title}
            </h3>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', overflow: 'hidden', margin: '0 0.75rem' }}>
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%',
                      padding: '0.875rem 1rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: index < section.items.length - 1 ? '1px solid #f9fafb' : 'none',
                      cursor: 'pointer',
                      fontSize: '0.9375rem',
                      color: '#111827',
                      textAlign: 'left',
                      minHeight: 48,
                    }}
                  >
                    <Icon size={18} style={{ color: '#6b7280' }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <ChevronRight size={16} style={{ color: '#d1d5db' }} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout */}
        <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setConfirmLogout(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: 'calc(100% - 1.5rem)',
              margin: '0 0.75rem',
              padding: '0.875rem 1rem',
              background: '#ffffff',
              border: 'none',
              borderRadius: '1rem',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              color: '#ef4444',
              minHeight: 48,
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* Delete Account */}
        <div>
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: 'calc(100% - 1.5rem)',
              margin: '0 0.75rem',
              padding: '0.875rem 1rem',
              background: '#ffffff',
              border: 'none',
              borderRadius: '1rem',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              color: '#ef4444',
              minHeight: 48,
            }}
          >
            <Trash2 size={18} />
            Delete Account
          </button>
        </div>
      </div>

      {/* Logout Confirmation */}
      {confirmLogout && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setConfirmLogout(false)}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1.5rem', maxWidth: 320, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>Logout?</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1rem' }}>Are you sure you want to logout?</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setConfirmLogout(false)} style={{ flex: 1, padding: '0.625rem', background: 'none', border: '1px solid #e5e7eb', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleLogout} style={{ flex: 1, padding: '0.625rem', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setConfirmDelete(false)}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1.5rem', maxWidth: 320, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', margin: '0 0 0.5rem' }}>Delete Account?</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1rem' }}>
              This action cannot be undone. Your profile, posts, and connections will be permanently deleted.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '0.625rem', background: 'none', border: '1px solid #e5e7eb', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleDeleteAccount} style={{ flex: 1, padding: '0.625rem', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

