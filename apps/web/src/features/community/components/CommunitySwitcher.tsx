import React, { useState, useEffect } from 'react';
import { X, Check, Users, MapPin, ChevronRight } from 'lucide-react';
import { supabase } from '@/config/supabase.client';

interface CommunitySwitcherProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentCommunityId: string;
  onSwitch: (communityId: string) => void;
}

interface JoinedCommunity {
  id: string;
  name: string;
  country: string;
  state: string | null;
  city: string | null;
  memberCount: number;
  isCurrent: boolean;
}

export const CommunitySwitcher: React.FC<CommunitySwitcherProps> = ({
  open,
  onClose,
  userId,
  currentCommunityId,
  onSwitch,
}) => {
  const [communities, setCommunities] = useState<JoinedCommunity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCommunities();
    }
  }, [open]);

  const loadCommunities = async () => {
    setLoading(true);

    // Get user's memberships
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId);

    if (memberships && memberships.length > 0) {
      const communityIds = memberships.map((m: any) => m.community_id);

      const { data: communityData } = await supabase
        .from('communities')
        .select('*')
        .in('id', communityIds)
        .order('member_count', { ascending: false });

      setCommunities(
        (communityData || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          country: c.country,
          state: c.state,
          city: c.city,
          memberCount: c.member_count || 0,
          isCurrent: c.id === currentCommunityId,
        }))
      );
    }

    setLoading(false);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1.5rem 1.5rem 0 0',
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          maxHeight: '70dvh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0.5rem 1rem calc(1.5rem + env(safe-area-inset-bottom))',
          animation: 'slideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 40,
            height: 4,
            backgroundColor: '#e5e7eb',
            borderRadius: '9999px',
            margin: '0 auto 0.75rem',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: 0 }}>
            Switch Community
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.5rem',
              borderRadius: '9999px',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</p>
        ) : communities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ fontSize: '0.9375rem', color: '#6b7280', margin: 0 }}>
              You haven't joined any communities yet.
            </p>
            <button
              style={{
                marginTop: '0.75rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
              onClick={() => {
                onClose();
                window.location.href = '/discover-communities';
              }}
            >
              Discover Communities
            </button>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {communities.map((community) => (
              <button
                key={community.id}
                onClick={() => {
                  onSwitch(community.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.875rem',
                  background: community.isCurrent ? '#fef2f2' : 'none',
                  border: community.isCurrent ? '1px solid #fecaca' : '1px solid transparent',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  marginBottom: '0.375rem',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: community.isCurrent ? '#ef4444' : '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: community.isCurrent ? '#ffffff' : '#6b7280',
                    flexShrink: 0,
                  }}
                >
                  {community.isCurrent ? <Check size={20} /> : <Users size={20} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                    {community.name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 0' }}>
                    <MapPin size={10} />
                    {' '}
                    {[community.city, community.state, community.country].filter(Boolean).join(', ')}
                    {' • '}
                    {community.memberCount} members
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: '#d1d5db', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
};
