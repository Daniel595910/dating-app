import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { supabase } from '@/config/supabase.client';
import {
  ArrowLeft, Trash2, Ban, Lock, Globe, Star, Plus,
  Clock, CheckCircle2, XCircle, Coins, Upload, Save,
  Archive, Link2, Copy, AlertTriangle,
} from 'lucide-react';
import { CommunityCreationSheet } from '@/features/community/components/CommunityCreationSheet';
import { communityService } from '@/features/community/services/community.service';
import { mediaService } from '@/features/community/services/media.service';

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
  status: string;
}

interface PendingMember {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  joinedAt: string;
  role: string;
  status: string;
  isBanned: boolean;
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
  // --- Settings form state ---
  const [settingsName, setSettingsName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsRules, setSettingsRules] = useState('');
  const [settingsCoverUrl, setSettingsCoverUrl] = useState<string | null>(null);
  const [settingsCountry, setSettingsCountry] = useState('');
  const [settingsState, setSettingsState] = useState('');
  const [settingsCity, setSettingsCity] = useState('');
  const [settingsAllowConnections, setSettingsAllowConnections] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  // --- Phase 3 state: invites + danger zone ---
  const [invites, setInvites] = useState<Array<{
    id: string; token: string; expiresAt: string | null;
    maxUses: number | null; useCount: number; createdAt: string;
  }>>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // --- Phase 4 state: member search + filter ---
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'active' | 'pending' | 'banned'>('all');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);
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
          country: c.country,
          state: c.state,
          city: c.city,
          memberCount: c.member_count || 0,
          postCount: c.post_count || 0,
          isPrivate: c.is_private || false,
          isSponsored: false,
          status: c.status || 'active',
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
      // Load invites for this community
    communityService.listInvites(selectedCommunity).then(setInvites);
    // Prefill settings form whenever selected community changes
    (async () => {
      const full = await communityService.getCommunityById(selectedCommunity);
      if (full) {
        setSettingsName(full.name || '');
        setSettingsDescription(full.description || '');
        setSettingsRules((full.rules || []).join('\n'));
        setSettingsCoverUrl(full.cover_image_url || null);
        setSettingsCountry(full.country || '');
        setSettingsState(full.state || '');
        setSettingsCity(full.city || '');
        setSettingsAllowConnections(full.allow_member_connections !== false);
      }
    })();        loadCommunityData(selectedCommunity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCommunity]);

  const loadCommunityData = async (communityId: string) => {
    const allMembers = await communityService.listCommunityMembers(communityId);
    if (allMembers.length > 0) {
      const userIds = allMembers.map((m) => m.userId);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setPendingMembers(
        allMembers.map((m) => ({
          id: m.id,
          userId: m.userId,
          userName: profileMap.get(m.userId)?.display_name || 'User',
          avatarUrl: profileMap.get(m.userId)?.avatar_url || null,
          joinedAt: m.joinedAt,
          role: m.role,
          status: m.status,
          isBanned: m.isBanned,
        }))
      );
    } else {
      setPendingMembers([]);
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

  const handleArchive = async () => {
    if (!selectedCommunity) return;
    setDangerLoading(true);
    try {
      const result = await communityService.archiveCommunity(selectedCommunity);
      if (!result.success) { showToast(result.error || 'Archive failed', 'error'); return; }
      showToast('Community archived', 'success');
      await loadManagedCommunities();
    } finally { setDangerLoading(false); }
  };

  const handleUnarchive = async () => {
    if (!selectedCommunity) return;
    setDangerLoading(true);
    try {
      const result = await communityService.unarchiveCommunity(selectedCommunity);
      if (!result.success) { showToast(result.error || 'Unarchive failed', 'error'); return; }
      showToast('Community unarchived', 'success');
      await loadManagedCommunities();
    } finally { setDangerLoading(false); }
  };

  const handleDeleteCommunity = async () => {
    if (!selectedCommunity || !currentCommunity) return;
    if (deleteConfirmText !== currentCommunity.name) {
      showToast('Type the community name exactly to confirm', 'error');
      return;
    }
    setDangerLoading(true);
    try {
      const result = await communityService.deleteCommunity(selectedCommunity);
      if (!result.success) { showToast(result.error || 'Delete failed', 'error'); return; }
      showToast('Community deleted', 'success');
      setDeleteConfirmOpen(false);
      setDeleteConfirmText('');
      setSelectedCommunity(null);
      await loadManagedCommunities();
    } finally { setDangerLoading(false); }
  };

  const handleGenerateInvite = async () => {
    if (!selectedCommunity || !user) return;
    setInviteLoading(true);
    try {
      const result = await communityService.createInvite(selectedCommunity, user.id, {
        expiresInDays: 7,
        maxUses: null,
      });
      if (!result.success) { showToast(result.error || 'Generate failed', 'error'); return; }
      const fresh = await communityService.listInvites(selectedCommunity);
      setInvites(fresh);
      showToast('Invite link created', 'success');
    } finally { setInviteLoading(false); }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const result = await communityService.revokeInvite(inviteId);
    if (!result.success) { showToast(result.error || 'Revoke failed', 'error'); return; }
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    showToast('Invite revoked', 'success');
  };

  const handleCopyInvite = async (token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied', 'success');
    } catch {
      showToast(url, 'info');
    }
  };
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setCoverUploading(true);
    try {
      const result = await mediaService.uploadImage(file, user.id, 'cover_photo');
      if (!result.success || !result.media) {
        showToast(result.error || 'Cover upload failed', 'error');
        return;
      }
      setSettingsCoverUrl(result.media.url);
      showToast('Cover uploaded — press Save to apply', 'success');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedCommunity) return;
    setSettingsSaving(true);
    try {
      const rulesArray = settingsRules
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);

      const result = await communityService.updateCommunity(selectedCommunity, {
        name: settingsName.trim(),
        description: settingsDescription.trim() || null,
        rules: rulesArray,
        coverImageUrl: settingsCoverUrl,
        country: settingsCountry.trim(),
        state: settingsState.trim() || null,
        city: settingsCity.trim() || null,
        allowMemberConnections: settingsAllowConnections,
      });

      if (!result.success) {
        showToast(result.error || 'Save failed', 'error');
        return;
      }

      setManagedCommunities((prev) =>
        prev.map((c) =>
          c.id === selectedCommunity ? { ...c, name: settingsName.trim() } : c
        )
      );
      showToast('Community updated', 'success');
    } finally {
      setSettingsSaving(false);
    }
  };
  const handleRoleChange = async (userId: string, role: 'member' | 'moderator' | 'admin') => {
    if (!selectedCommunity) return;
    const result = await communityService.updateMemberRole(selectedCommunity, userId, role);
    if (!result.success) { showToast(result.error || 'Role update failed', 'error'); return; }
    setPendingMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } : m)));
    showToast(`Role updated to ${role}`, 'success');
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedCommunity || !user) return;
    const result = await communityService.removeMember(selectedCommunity, userId, user.id);
    if (!result.success) { showToast(result.error || 'Remove failed', 'error'); return; }
    setPendingMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, status: 'removed' } : m)));
    showToast('Member removed', 'success');
  };

  const handleApproveMember = async (userId: string) => {
    if (!selectedCommunity) return;
    const result = await communityService.approveMember(selectedCommunity, userId);
    if (!result.success) { showToast(result.error || 'Approve failed', 'error'); return; }
    setPendingMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, status: 'active' } : m)));
    showToast('Member approved', 'success');
  };

  const handleRejectMember = async (userId: string) => {
    if (!selectedCommunity || !user) return;
    const result = await communityService.rejectMember(selectedCommunity, userId, user.id);
    if (!result.success) { showToast(result.error || 'Reject failed', 'error'); return; }
    setPendingMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, status: 'removed' } : m)));
    showToast('Member rejected', 'success');
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
                {/* Search + filters */}
                <input
                  type="text"
                  placeholder="Search members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', fontSize: '0.875rem', marginBottom: '0.625rem', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.875rem', overflowX: 'auto' }}>
                  {(['all', 'active', 'pending', 'banned'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setMemberFilter(f)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        background: memberFilter === f ? '#ef4444' : '#ffffff',
                        color: memberFilter === f ? '#ffffff' : '#374151',
                        border: memberFilter === f ? 'none' : '1px solid #e5e7eb',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Member list */}
                {(() => {
                  const q = memberSearch.trim().toLowerCase();
                  const visible = pendingMembers.filter((m) => {
                    if (memberFilter === 'active'  && m.status !== 'active') return false;
                    if (memberFilter === 'pending' && m.status !== 'pending') return false;
                    if (memberFilter === 'banned'  && !m.isBanned && m.status !== 'removed') return false;
                    if (q && !m.userName.toLowerCase().includes(q)) return false;
                    return true;
                  });

                  if (visible.length === 0) {
                    return <p style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No members match.</p>;
                  }

                  return visible.map((member) => (
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
                          width: 40, height: 40, borderRadius: '50%',
                          backgroundColor: '#f3f4f6', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, color: '#6b7280',
                          overflow: 'hidden', flexShrink: 0,
                        }}
                      >
                        {member.avatarUrl
                          ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : member.userName.charAt(0).toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.userName}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#6b7280', display: 'flex', gap: '0.5rem' }}>
                          <span>{member.role}</span>
                          {member.status === 'pending' && <span style={{ color: '#f59e0b', fontWeight: 600 }}>pending</span>}
                          {member.status === 'removed' && <span style={{ color: '#ef4444', fontWeight: 600 }}>removed</span>}
                          {member.isBanned && <span style={{ color: '#ef4444', fontWeight: 600 }}>banned</span>}
                        </div>
                      </div>

                      {/* Pending: approve / reject */}
                      {member.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApproveMember(member.userId)}
                            style={{ background: '#dcfce7', border: 'none', cursor: 'pointer', color: '#16a34a', padding: '0.5rem', borderRadius: '9999px' }}
                            title="Approve"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            onClick={() => handleRejectMember(member.userId)}
                            style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.5rem', borderRadius: '9999px' }}
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.userId, e.target.value as any)}
                            style={{ padding: '0.375rem 0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#374151', background: '#ffffff', cursor: 'pointer' }}
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                          {member.status !== 'removed' && !member.isBanned && (
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0.5rem', borderRadius: '9999px' }}
                              title="Remove"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                          {!member.isBanned && (
                            <button
                              onClick={() => handleBanMember(member.userId)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.5rem', borderRadius: '9999px' }}
                              title="Ban"
                            >
                              <Ban size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ));
                })()}
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
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: '0 0 1rem' }}>
                  Community Settings
                </h3>

                {/* Cover image */}
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Cover Image
                </label>
                <div style={{ marginBottom: '1rem' }}>
                  {settingsCoverUrl ? (
                    <img
                      src={settingsCoverUrl}
                      alt="Cover"
                      style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: '0.75rem', marginBottom: '0.5rem' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: 140, borderRadius: '0.75rem', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                      No cover set
                    </div>
                  )}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', background: '#f3f4f6', border: 'none', borderRadius: '9999px', cursor: coverUploading ? 'wait' : 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>
                    <Upload size={14} />
                    {coverUploading ? 'Uploading...' : 'Change Cover'}
                    <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={coverUploading} style={{ display: 'none' }} />
                  </label>
                </div>

                {/* Name */}
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.625rem', fontSize: '0.875rem', color: '#111827', marginBottom: '1rem', boxSizing: 'border-box' }}
                />

                {/* Description */}
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Description
                </label>
                <textarea
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.625rem', fontSize: '0.875rem', color: '#111827', marginBottom: '1rem', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                />

                {/* Rules */}
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Rules (one per line)
                </label>
                <textarea
                  value={settingsRules}
                  onChange={(e) => setSettingsRules(e.target.value)}
                  rows={4}
                  placeholder={'Be respectful\nNo spam\nStay on topic'}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.625rem', fontSize: '0.875rem', color: '#111827', marginBottom: '1rem', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                />

                {/* Location */}
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Country
                </label>
                <input
                  type="text"
                  value={settingsCountry}
                  onChange={(e) => setSettingsCountry(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.625rem', fontSize: '0.875rem', color: '#111827', marginBottom: '1rem', boxSizing: 'border-box' }}
                />

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      State
                    </label>
                    <input
                      type="text"
                      value={settingsState}
                      onChange={(e) => setSettingsState(e.target.value)}
                      style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.625rem', fontSize: '0.875rem', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      City
                    </label>
                    <input
                      type="text"
                      value={settingsCity}
                      onChange={(e) => setSettingsCity(e.target.value)}
                      style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.625rem', fontSize: '0.875rem', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Allow member connections switch */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    background: '#f9fafb',
                    border: '1px solid #f3f4f6',
                    borderRadius: '0.875rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                      Allow member connections
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem', lineHeight: 1.4 }}>
                      Members can send "Get to Know" requests from your community page
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settingsAllowConnections}
                    aria-label="Allow member connections"
                    onClick={() => setSettingsAllowConnections((v) => !v)}
                    style={{
                      position: 'relative',
                      flexShrink: 0,
                      width: 48,
                      height: 28,
                      borderRadius: '9999px',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      background: settingsAllowConnections
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : '#d1d5db',
                      transition: 'background 0.2s ease',
                      boxShadow: settingsAllowConnections
                        ? '0 2px 8px rgba(239, 68, 68, 0.25)'
                        : 'inset 0 1px 2px rgba(0,0,0,0.06)',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: settingsAllowConnections ? 22 : 2,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)',
                        transition: 'left 0.2s ease',
                      }}
                    />
                  </button>
                </div>

                {/* Save */}
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving || !settingsName.trim()}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.875rem',
                    background: settingsSaving || !settingsName.trim() ? '#f3f4f6' : '#ef4444',
                    color: settingsSaving || !settingsName.trim() ? '#9ca3af' : '#ffffff',
                    border: 'none',
                    borderRadius: '1rem',
                    cursor: settingsSaving || !settingsName.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  <Save size={16} />
                  {settingsSaving ? 'Saving...' : 'Save Changes'}
                </button>

                {/* ============ INVITE LINKS ============ */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Link2 size={16} style={{ color: '#6b7280' }} />
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: 0, flex: 1 }}>
                      Invite Links
                    </h4>
                    <button
                      onClick={handleGenerateInvite}
                      disabled={inviteLoading}
                      style={{ padding: '0.375rem 0.75rem', background: inviteLoading ? '#f3f4f6' : '#111827', color: inviteLoading ? '#9ca3af' : '#ffffff', border: 'none', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, cursor: inviteLoading ? 'wait' : 'pointer' }}
                    >
                      {inviteLoading ? 'Creating...' : 'Generate'}
                    </button>
                  </div>

                  {invites.length === 0 ? (
                    <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: 0 }}>
                      No active invites. Generate one to share.
                    </p>
                  ) : (
                    invites.map((inv) => (
                      <div
                        key={inv.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', background: '#f9fafb', borderRadius: '0.625rem', marginBottom: '0.5rem' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            /join/{inv.token.slice(0, 12)}…
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                            {inv.expiresAt ? `Expires ${new Date(inv.expiresAt).toLocaleDateString()}` : 'No expiry'}
                            {' · '}
                            Used {inv.useCount}{inv.maxUses ? `/${inv.maxUses}` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopyInvite(inv.token)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111827', padding: '0.375rem', borderRadius: '9999px' }}
                          title="Copy link"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.375rem', borderRadius: '9999px' }}
                          title="Revoke"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* ============ DANGER ZONE ============ */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #fef2f2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ef4444', margin: 0 }}>
                      Danger Zone
                    </h4>
                  </div>

                  {currentCommunity?.status === 'archived' ? (
                    <button
                      onClick={handleUnarchive}
                      disabled={dangerLoading}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'none', border: '1px solid #10b981', color: '#10b981', borderRadius: '0.75rem', fontSize: '0.8125rem', fontWeight: 600, cursor: dangerLoading ? 'wait' : 'pointer', marginBottom: '0.5rem' }}
                    >
                      <Archive size={14} />
                      Unarchive Community
                    </button>
                  ) : (
                    <button
                      onClick={handleArchive}
                      disabled={dangerLoading}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'none', border: '1px solid #f59e0b', color: '#f59e0b', borderRadius: '0.75rem', fontSize: '0.8125rem', fontWeight: 600, cursor: dangerLoading ? 'wait' : 'pointer', marginBottom: '0.5rem' }}
                    >
                      <Archive size={14} />
                      Archive Community
                    </button>
                  )}

                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: '#fef2f2', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '0.75rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                    Delete Community
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {deleteConfirmOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmText(''); }}
        >
          <div
            style={{ background: '#ffffff', borderRadius: '1rem', padding: '1.5rem', maxWidth: 400, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                Delete Community?
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 1rem', lineHeight: 1.5 }}>
              This permanently deletes <strong>{currentCommunity?.name}</strong>, all its members, posts, and invites. This cannot be undone.
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.375rem' }}>
              Type <strong>{currentCommunity?.name}</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.625rem', fontSize: '0.875rem', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmText(''); }}
                style={{ flex: 1, padding: '0.75rem', background: 'none', border: '1px solid #e5e7eb', color: '#6b7280', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCommunity}
                disabled={dangerLoading || deleteConfirmText !== currentCommunity?.name}
                style={{ flex: 1, padding: '0.75rem', background: deleteConfirmText === currentCommunity?.name ? '#ef4444' : '#f3f4f6', color: deleteConfirmText === currentCommunity?.name ? '#ffffff' : '#9ca3af', border: 'none', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: deleteConfirmText === currentCommunity?.name ? 'pointer' : 'not-allowed' }}
              >
                {dangerLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
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
