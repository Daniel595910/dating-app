import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { supabase } from '@/config/supabase.client';
import {
  ArrowLeft, Trash2, Ban, Lock, Globe, Star, Plus,
  Clock, CheckCircle2, XCircle, Coins,
} from 'lucide-react';
import { CommunityCreationSheet } from '@/features/community/components/CommunityCreationSheet';

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

interface MyRequest {
  id: string;
  name: string;
  country: string;
  state: string | null;
  city: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
}

export const CommunityManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const showToast = useUIStore((state) => state.showToast);

  const [managedCommunities, setManagedCommunities] = useState<ManagedCommunity[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [recentComments, setRecentComments] = useState<CommunityComment[]>([]);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [vipData, setVipData] = useState<{ level: string; credits: number }>({
    level: 'free',
    credits: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'comments' | 'settings'>('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadManagedCommunities = useCallback(async () => {
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

      setManagedCommunities(
        (communities || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          type: c.type,
          status: c.status,
          country: c.country,
          state: c.state,
          city: c.city,
          memberCount: c.member_count || 0,
          postCount: c.post_count || 0,
          isPrivate: c.is_private || false,
          isSponsored: false,
        }))
      );
      if (communities && communities.length > 0) {
        setSelectedCommunity(communities[0].id);
      }
    } else {
      setManagedCommunities([]);
    }
  }, [user]);

  const loadVipData = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('vip_accounts')
      .select('level, community_credits')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setVipData({
        level: data.level || 'free',
        credits: data.community_credits || 0,
      });
    }
  }, [user]);

  const loadMyRequests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('community_creation_requests')
      .select('id, name, country, state, city, status, rejection_reason, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    setMyRequests((data || []) as MyRequest[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      loadManagedCommunities(),
      loadVipData(),
      loadMyRequests(),
    ]).finally(() => setLoading(false));
  }, [user, loadManagedCommunities, loadVipData, loadMyRequests]);

  useEffect(() => {
    if (selectedCommunity) {
      loadCommunityData(selectedCommunity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCommunity]);

  const loadCommunityData = async (communityId: string) => {
    const { data: members } = await supabase
      .from('community_members')
      .select('*')
      .eq('community_id', communityId)
      .eq('is_banned', false);

    if (members) {
      const userIds = members.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setPendingMembers(
        members.map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          userName: profileMap.get(m.user_id)?.display_name || 'User',
          avatarUrl: profileMap.get(m.user_id)?.avatar_url || null,
          joinedAt: m.joined_at,
        }))
      );
    }

    const { data: comments } = await supabase
      .from('comments')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);

    if (comments) {
      const authorIds = [...new Set(comments.map((c: any) => c.author_id))];
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
    const { error } = await supabase
      .from('community_members')
      .update({ is_banned: true })
      .eq('community_id', selectedCommunity)
      .eq('user_id', userId);

    if (error) {
      showToast(`Ban failed: ${error.message}`, 'error');
      return;
    }
    setPendingMembers((prev) => prev.filter((m) => m.userId !== userId));
    showToast('Member banned', 'success');
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .update({ status: 'deleted' })
      .eq('id', commentId);

    if (error) {
      showToast(`Delete failed: ${error.message}`, 'error');
      return;
    }
    setRecentComments((prev) => prev.filter((c) => c.id !== commentId));
    showToast('Comment deleted', 'success');
  };

  const handleTogglePrivate = async (isPrivate: boolean) => {
    const { error } = await supabase
      .from('communities')
      .update({ status: isPrivate ? 'locked' : 'active' })
      .eq('id', selectedCommunity);

    if (error) {
      showToast(`Update failed: ${error.message}`, 'error');
      return;
    }

    setManagedCommunities((prev) =>
      prev.map((c) => (c.id === selectedCommunity ? { ...c, isPrivate } : c))
    );
    showToast(isPrivate ? 'Community is now private' : 'Community is now public', 'success');
  };

  const handleSponsor = async () => {
    if (!user || !selectedCommunity) return;

    if (vipData.level === 'free') {
      showToast('Upgrade to VIP to sponsor communities.', 'warning');
      return;
    }
    if (vipData.credits < 50) {
      showToast(`You have ${vipData.credits} credits. 50 required.`, 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('sponsor_community', {
        p_community_id: selectedCommunity,
      });
      if (error) throw error;

      showToast('Community sponsored — 50 credits deducted', 'success');
      await loadVipData();
      setManagedCommunities((prev) =>
        prev.map((c) => (c.id === selectedCommunity ? { ...c, isSponsored: true } : c))
      );
    } catch (err: any) {
      showToast(`Sponsorship failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSuccess = async () => {
    await Promise.all([loadVipData(), loadMyRequests()]);
    setCreateOpen(false);
    showToast('Request submitted — an admin will review it shortly', 'success');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
        Loading...
      </div>
    );
  }

  const currentCommunity = managedCommunities.find((c) => c.id === selectedCommunity);
  const canCreate = vipData.level !== 'free' && vipData.credits >= 100;

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#faf9f7', maxWidth: 480, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 0.75rem',
          paddingTop: 'calc(0.625rem + env(safe-area-inset-top))',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #f3f4f6',
        }}
      >
        <button
          onClick={() => navigate('/profile')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#111827',
            padding: '0.5rem',
            borderRadius: '9999px',
            minWidth: 44,
            minHeight: 44,
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0, flex: 1 }}>
          My Communities
        </h1>
        <button
          onClick={() => setCreateOpen(true)}
          disabled={!canCreate}
          style={{
            background: canCreate ? '#ef4444' : '#f3f4f6',
            color: canCreate ? '#ffffff' : '#9ca3af',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.5rem 0.875rem',
            cursor: canCreate ? 'pointer' : 'not-allowed',
            fontSize: '0.8125rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <Plus size={14} />
          Create
        </button>
      </header>

      <div style={{ padding: '1rem' }}>
        {/* Credits chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#ffffff',
            borderRadius: '1rem',
            marginBottom: '1rem',
          }}
        >
          <Coins size={18} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Community credits</span>
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', marginLeft: 'auto' }}>
            {vipData.credits}
          </span>
        </div>

        {/* My requests */}
        {myRequests.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
              My Requests
            </h3>
            {myRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.75rem',
                  marginBottom: '0.375rem',
                }}
              >
                {req.status === 'pending' && <Clock size={16} style={{ color: '#f59e0b' }} />}
                {req.status === 'approved' && <CheckCircle2 size={16} style={{ color: '#10b981' }} />}
                {req.status === 'rejected' && <XCircle size={16} style={{ color: '#ef4444' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                    {req.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {[req.city, req.state, req.country].filter(Boolean).join(', ')}
                    {req.status === 'rejected' && req.rejection_reason && (
                      <>
                        <br />
                        <span style={{ color: '#ef4444' }}>
                          Rejected: {req.rejection_reason}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color:
                      req.status === 'pending'
                        ? '#f59e0b'
                        : req.status === 'approved'
                        ? '#10b981'
                        : '#ef4444',
                  }}
                >
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {managedCommunities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ fontSize: '1rem', color: '#6b7280' }}>You don't manage any communities yet.</p>
            <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
              {canCreate
                ? 'Click "Create" to start one.'
                : vipData.level === 'free'
                ? 'VIP membership required to create communities.'
                : `You need 100 credits (you have ${vipData.credits}).`}
            </p>
          </div>
        ) : (
          <>
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

            {currentCommunity && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '1rem',
                  padding: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: 0, flex: 1 }}>
                    {currentCommunity.name}
                  </h2>
                  {currentCommunity.isSponsored && (
                    <span
                      style={{
                        padding: '0.25rem 0.625rem',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '9999px',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                      }}
                    >
                      Sponsored
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

            <div
              style={{
                display: 'flex',
                backgroundColor: '#ffffff',
                borderRadius: '1rem',
                overflow: 'hidden',
                marginBottom: '1rem',
              }}
            >
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

            {activeTab === 'overview' && (
              <div>
                <button
                  onClick={handleSponsor}
                  disabled={actionLoading || vipData.credits < 50 || vipData.level === 'free'}
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
                    opacity: actionLoading || vipData.credits < 50 || vipData.level === 'free' ? 0.5 : 1,
                  }}
                >
                  <Star size={16} />
                  {actionLoading ? 'Processing...' : 'Sponsor Community (50 credits)'}
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
                  <p style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No members</p>
                ) : (
                  pendingMembers.map((member) => (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '0.75rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: '#6b7280',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          member.userName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                        {member.userName}
                      </span>
                      <button
                        onClick={() => handleBanMember(member.userId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          padding: '0.5rem',
                          borderRadius: '9999px',
                        }}
                      >
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
                  <p style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No comments</p>
                ) : (
                  recentComments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '0.75rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>
                          {comment.authorName}
                        </span>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            padding: '0.25rem',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: '#374151', margin: 0 }}>
                        {comment.content}
                      </p>
                      <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
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
                <ul style={{ fontSize: '0.8125rem', color: '#374151', paddingLeft: '1.25rem' }}>
                  <li>Toggle private/public</li>
                  <li>Sponsor community</li>
                  <li>Ban members</li>
                  <li>Delete comments</li>
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <CommunityCreationSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        userId={user?.id || ''}
        vipLevel={vipData.level}
        credits={vipData.credits}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};
