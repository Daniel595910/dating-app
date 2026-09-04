import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Settings, Users, Trash2, Ban, Check, X, Lock, Globe, Star, MessageCircle } from 'lucide-react';

interface ManagedCommunity {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  country: string;
  state: string | null;
  city: string | null;
  memberCount: number;
  postCount: number;
  isPrivate: boolean;
  isSponsored: boolean;
}

interface PendingMember {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  joinedAt: string;
}

interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export const CommunityManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [managedCommunities, setManagedCommunities] = useState<ManagedCommunity[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [recentComments, setRecentComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'comments' | 'settings'>('overview');

  useEffect(() => {
    loadManagedCommunities();
  }, [user]);

  const loadManagedCommunities = async () => {
    if (!user) return;

    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (memberships && memberships.length > 0) {
      const communityIds = memberships.map((m: any) => m.community_id);
      const { data: communities } = await supabase
        .from('communities')
        .select('*')
        .in('id', communityIds);

      setManagedCommunities(communities || []);
      if (communities && communities.length > 0) {
        setSelectedCommunity(communities[0].id);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (selectedCommunity) {
      loadCommunityData(selectedCommunity);
    }
  }, [selectedCommunity]);

  const loadCommunityData = async (communityId: string) => {
    // Load pending members
    const { data: pending } = await supabase
      .from('community_members')
      .select('*')
      .eq('community_id', communityId)
      .eq('is_banned', false);

    // Load recent comments
    const { data: comments } = await supabase
      .from('comments')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);

    if (pending) {
      const userIds = pending.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setPendingMembers(
        pending.map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          userName: profileMap.get(m.user_id)?.display_name || 'User',
          avatarUrl: profileMap.get(m.user_id)?.avatar_url || null,
          joinedAt: m.joined_at,
        }))
      );
    }

    if (comments) {
      const authorIds = comments.map((c: any) => c.author_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', authorIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setRecentComments(
        comments.map((c: any) => ({
          id: c.id,
          postId: c.post_id,
          authorId: c.author_id,
          authorName: profileMap.get(c.author_id)?.display_name || 'User',
          content: c.content,
          createdAt: c.created_at,
        }))
      );
    }
  };

  const handleBanMember = async (userId: string) => {
    await supabase
      .from('community_members')
      .update({ is_banned: true })
      .eq('community_id', selectedCommunity)
      .eq('user_id', userId);

    setPendingMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase
      .from('comments')
      .update({ status: 'deleted' })
      .eq('id', commentId);

    setRecentComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleTogglePrivate = async (isPrivate: boolean) => {
    await supabase
      .from('communities')
      .update({ status: isPrivate ? 'locked' : 'active' })
      .eq('id', selectedCommunity);

    setManagedCommunities((prev) =>
      prev.map((c) => (c.id === selectedCommunity ? { ...c, isPrivate } : c))
    );
  };

  const handleSponsor = async () => {
    if (!user) return;

    await supabase.from('community_sponsorships').insert({
      community_id: selectedCommunity,
      sponsor_id: user.id,
      amount_paid: 50,
      is_active: true,
      ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    setManagedCommunities((prev) =>
      prev.map((c) => (c.id === selectedCommunity ? { ...c, isSponsored: true } : c))
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
        Loading...
      </div>
    );
  }

  if (managedCommunities.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ fontSize: '1rem', color: '#6b7280' }}>You don't manage any communities yet.</p>
        <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
          Create a community to start managing it.
        </p>
      </div>
    );
  }

  const currentCommunity = managedCommunities.find((c) => c.id === selectedCommunity);

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#faf9f7', maxWidth: 480, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', paddingTop: 'calc(0.625rem + env(safe-area-inset-top))', backgroundColor: '#ffffff', borderBottom: '1px solid #f3f4f6' }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111827', padding: '0.5rem', borderRadius: '9999px', minWidth: 44, minHeight: 44 }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>My Communities</h1>
      </header>

      <div style={{ padding: '1rem' }}>
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Community Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto' }}>
          {managedCommunities.map((community) => (
            <button
              key={community.id}
              onClick={() => setSelectedCommunity(community.id)}
              style={{
                padding: '0.5rem 1rem',
                background: selectedCommunity === community.id ? '#ef4444' : '#ffffff',
                color: selectedCommunity === community.id ? '#ffffff' : '#111827',
                border: selectedCommunity === community.id ? 'none' : '1px solid #e5e7eb',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {community.name}
            </button>
          ))}
        </div>

        {/* Community Info */}
        {currentCommunity && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: 0, flex: 1 }}>
                {currentCommunity.name}
              </h2>
              {currentCommunity.isSponsored && (
                <span style={{ padding: '0.25rem 0.625rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600 }}>
                  ⭐ Sponsored
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
              <span>{currentCommunity.memberCount} members</span>
              <span>{currentCommunity.postCount} posts</span>
              <span>{currentCommunity.isPrivate ? 'Private' : 'Public'}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', backgroundColor: '#ffffff', borderRadius: '1rem', overflow: 'hidden', marginBottom: '1rem' }}>
          {(['overview', 'members', 'comments', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: activeTab === tab ? '#ef4444' : 'none',
                color: activeTab === tab ? '#ffffff' : '#6b7280',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            <button
              onClick={handleSponsor}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem',
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                border: 'none',
                borderRadius: '1rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#92400e',
                marginBottom: '0.75rem',
              }}
            >
              <Star size={16} />
              Sponsor Community (50 credits)
            </button>
            <button
              onClick={() => handleTogglePrivate(!currentCommunity?.isPrivate)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '1rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#111827',
              }}
            >
              {currentCommunity?.isPrivate ? <Lock size={16} /> : <Globe size={16} />}
              {currentCommunity?.isPrivate ? 'Make Public' : 'Make Private'}
            </button>
          </div>
        )}

        {activeTab === 'members' && (
          <div>
            {pendingMembers.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                No members
              </p>
            ) : (
              pendingMembers.map((member) => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6b7280', overflow: 'hidden', flexShrink: 0 }}>
                    {member.avatarUrl ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : member.userName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{member.userName}</span>
                  <button onClick={() => handleBanMember(member.userId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.5rem', borderRadius: '9999px' }}>
                    <Ban size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div>
            {recentComments.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                No comments
              </p>
            ) : (
              recentComments.map((comment) => (
                <div key={comment.id} style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>{comment.authorName}</span>
                    <button onClick={() => handleDeleteComment(comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.25rem' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#374151', margin: 0 }}>{comment.content}</p>
                  <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: '0 0 0.75rem' }}>
              Community Settings
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
              Full community settings coming soon. Currently you can:
            </p>
            <ul style={{ fontSize: '0.8125rem', color: '#374151', paddingLeft: '1.25rem' }}>
              <li>Toggle private/public</li>
              <li>Sponsor community</li>
              <li>Ban members</li>
              <li>Delete comments</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
