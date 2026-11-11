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
import styles from './CommunityManagementPage.module.css';

interface ManagedCommunity {
  id: string; name: string; slug: string; type: string; status: string;
  country: string; state: string | null; city: string | null;
  memberCount: number; postCount: number; isPrivate: boolean; isSponsored: boolean;
}

interface PendingMember {
  id: string; userId: string; userName: string; avatarUrl: string | null;
  joinedAt: string; role: string; status: string; isBanned: boolean;
}

interface CommunityComment {
  id: string; postId: string; authorId: string; authorName: string; content: string; createdAt: string;
}

interface MyRequest {
  id: string; name: string; country: string; state: string | null; city: string | null;
  status: 'pending' | 'approved' | 'rejected'; rejection_reason: string | null; created_at: string;
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
  const [vipData, setVipData] = useState<{ level: string; credits: number }>({ level: 'free', credits: 0 });
  
  const [settingsName, setSettingsName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsRules, setSettingsRules] = useState('');
  const [settingsCoverUrl, setSettingsCoverUrl] = useState<string | null>(null);
  const [settingsCountry, setSettingsCountry] = useState('');
  const [settingsState, setSettingsState] = useState('');
  const [settingsCity, setSettingsCity] = useState('');
  const [settingsAllowConnections, setSettingsAllowConnections] = useState(true);

  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<7 | 30>(7);

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'active' | 'pending' | 'banned'>('all');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'comments' | 'settings' | 'analytics'>('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'analytics' || !selectedCommunity) return;
    setAnalyticsLoading(true);
    communityService.getCommunityAnalytics(selectedCommunity).then(setAnalytics).finally(() => setAnalyticsLoading(false));
  }, [activeTab, selectedCommunity]);

  const loadManagedCommunities = useCallback(async () => {
    if (!user) return;
    const { data: memberships } = await supabase.from('community_members').select('community_id').eq('user_id', user.id).eq('role', 'admin');
    if (memberships && memberships.length > 0) {
      const communityIds = memberships.map((m: any) => m.community_id);
      const { data: communities } = await supabase.from('communities').select('*').in('id', communityIds);
      setManagedCommunities((communities || []).map((c: any) => ({
        id: c.id, name: c.name, slug: c.slug, type: c.type, country: c.country, state: c.state, city: c.city,
        memberCount: c.member_count || 0, postCount: c.post_count || 0, isPrivate: c.is_private || false,
        isSponsored: false, status: c.status || 'active',
      })));
      if (communities && communities.length > 0) setSelectedCommunity(communities[0].id);
    } else {
      setManagedCommunities([]);
    }
  }, [user]);

  const loadVipData = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vip_accounts').select('level, community_credits').eq('user_id', user.id).maybeSingle();
    if (data) setVipData({ level: data.level || 'free', credits: data.community_credits || 0 });
  }, [user]);

  const loadMyRequests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('community_creation_requests').select('id, name, country, state, city, status, rejection_reason, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    setMyRequests((data || []) as MyRequest[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([loadManagedCommunities(), loadVipData(), loadMyRequests()]).finally(() => setLoading(false));
  }, [user, loadManagedCommunities, loadVipData, loadMyRequests]);

  useEffect(() => {
    if (selectedCommunity) {
      communityService.listInvites(selectedCommunity).then(setInvites);
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
      })();
      loadCommunityData(selectedCommunity);
    }
  }, [selectedCommunity]);

  const loadCommunityData = async (communityId: string) => {
    const allMembers = await communityService.listCommunityMembers(communityId);
    if (allMembers.length > 0) {
      const userIds = allMembers.map((m) => m.userId);
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setPendingMembers(allMembers.map((m) => ({
        id: m.id, userId: m.userId, userName: profileMap.get(m.userId)?.display_name || 'User',
        avatarUrl: profileMap.get(m.userId)?.avatar_url || null, joinedAt: m.joinedAt, role: m.role, status: m.status, isBanned: m.isBanned,
      })));
    } else {
      setPendingMembers([]);
    }

    const { data: comments } = await supabase.from('comments').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(20);
    if (comments) {
      const authorIds = [...new Set(comments.map((c: any) => c.author_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setRecentComments(comments.map((c: any) => ({
        id: c.id, postId: c.post_id, authorId: c.author_id, authorName: profileMap.get(c.author_id)?.display_name || 'User',
        content: c.content, createdAt: c.created_at,
      })));
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
      const result = await communityService.createInvite(selectedCommunity, user.id, { expiresInDays: 7, maxUses: null });
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
      if (!result.success || !result.media) { showToast(result.error || 'Cover upload failed', 'error'); return; }
      setSettingsCoverUrl(result.media.url);
      showToast('Cover uploaded — press Save to apply', 'success');
    } finally { setCoverUploading(false); }
  };

  const handleSaveSettings = async () => {
    if (!selectedCommunity) return;
    setSettingsSaving(true);
    try {
      const rulesArray = settingsRules.split('\n').map((r) => r.trim()).filter(Boolean);
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

      if (!result.success) { showToast(result.error || 'Save failed', 'error'); return; }
      setManagedCommunities((prev) => prev.map((c) => c.id === selectedCommunity ? { ...c, name: settingsName.trim() } : c));
      showToast('Community updated', 'success');
    } finally { setSettingsSaving(false); }
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
    const { error } = await supabase.from('community_members').update({ is_banned: true }).eq('community_id', selectedCommunity).eq('user_id', userId);
    if (error) { showToast(`Ban failed: ${error.message}`, 'error'); return; }
    setPendingMembers((prev) => prev.filter((m) => m.userId !== userId));
    showToast('Member banned', 'success');
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('comments').update({ status: 'deleted' }).eq('id', commentId);
    if (error) { showToast(`Delete failed: ${error.message}`, 'error'); return; }
    setRecentComments((prev) => prev.filter((c) => c.id !== commentId));
    showToast('Comment deleted', 'success');
  };

  const handleTogglePrivate = async (isPrivate: boolean) => {
    const { error } = await supabase.from('communities').update({ status: isPrivate ? 'locked' : 'active' }).eq('id', selectedCommunity);
    if (error) { showToast(`Update failed: ${error.message}`, 'error'); return; }
    setManagedCommunities((prev) => prev.map((c) => (c.id === selectedCommunity ? { ...c, isPrivate } : c)));
    showToast(isPrivate ? 'Community is now private' : 'Community is now public', 'success');
  };

  const handleSponsor = async () => {
    if (!user || !selectedCommunity) return;
    if (vipData.level === 'free') { showToast('Upgrade to VIP to sponsor communities.', 'warning'); return; }
    if (vipData.credits < 50) { showToast(`You have ${vipData.credits} credits. 50 required.`, 'warning'); return; }

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('sponsor_community', { p_community_id: selectedCommunity });
      if (error) throw error;
      showToast('Community sponsored — 50 credits deducted', 'success');
      await loadVipData();
      setManagedCommunities((prev) => prev.map((c) => (c.id === selectedCommunity ? { ...c, isSponsored: true } : c)));
    } catch (err: any) {
      showToast(`Sponsorship failed: ${err.message}`, 'error');
    } finally { setActionLoading(false); }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading...</div>;
  }

  const currentCommunity = managedCommunities.find((c) => c.id === selectedCommunity);
  const canCreate = vipData.level !== 'free' && vipData.credits >= 100;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/profile')}>
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>My Communities</h1>
        <button
          className={`${styles.createButton} ${canCreate ? styles.createButtonActive : styles.createButtonDisabled}`}
          onClick={() => setCreateOpen(true)}
          disabled={!canCreate}
        >
          <Plus size={14} />
          Create
        </button>
      </header>

      <div className={styles.content}>
        <div className={styles.creditsChip}>
          <Coins size={18} style={{ color: '#f59e0b' }} />
          <span className={styles.creditsLabel}>Community credits</span>
          <span className={styles.creditsValue}>{vipData.credits}</span>
        </div>

        {myRequests.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 className={styles.cardTitle}>My Requests</h3>
            {myRequests.map((req) => (
              <div key={req.id} className={styles.requestRow}>
                {req.status === 'pending' && <Clock size={16} color="#f59e0b" />}
                {req.status === 'approved' && <CheckCircle2 size={16} color="#10b981" />}
                {req.status === 'rejected' && <XCircle size={16} color="#ef4444" />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.requestName}>{req.name}</div>
                  <div className={styles.requestMeta}>
                    {[req.city, req.state, req.country].filter(Boolean).join(', ')}
                  </div>
                </div>
                <span className={`${styles.requestStatus}`} style={{ color: req.status === 'pending' ? '#f59e0b' : req.status === 'approved' ? '#10b981' : '#ef4444' }}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {managedCommunities.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>You don't manage any communities yet.</p>
            <p className={styles.emptyText}>
              {canCreate ? 'Click "Create" to start one.' : vipData.level === 'free' ? 'VIP membership required to create communities.' : `You need 100 credits (you have ${vipData.credits}).`}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.switcherScroll}>
              {managedCommunities.map((community) => (
                <button
                  key={community.id}
                  className={`${styles.switcherPill} ${selectedCommunity === community.id ? styles.switcherPillActive : styles.switcherPillInactive}`}
                  onClick={() => setSelectedCommunity(community.id)}
                >
                  {community.name}
                </button>
              ))}
            </div>

            {currentCommunity && (
              <div className={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)', margin: 0, flex: 1 }}>
                    {currentCommunity.name}
                  </h2>
                  {currentCommunity.isSponsored && (
                    <span style={{ padding: '0.25rem 0.625rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600 }}>
                      Sponsored
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <span>{currentCommunity.memberCount} members</span>
                  <span>{currentCommunity.postCount} posts</span>
                  <span>{currentCommunity.isPrivate ? 'Private' : 'Public'}</span>
                </div>
              </div>
            )}

            <div className={styles.tabs}>
              {(['overview', 'members', 'comments', 'settings', 'analytics'] as const).map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div>
                <button
                  className={styles.goldBtn}
                  onClick={handleSponsor}
                  disabled={actionLoading || vipData.credits < 50 || vipData.level === 'free'}
                >
                  <Star size={16} />
                  {actionLoading ? 'Processing...' : 'Sponsor Community (50 credits)'}
                </button>
                <button className={styles.secondaryBtn} onClick={() => handleTogglePrivate(!currentCommunity?.isPrivate)}>
                  {currentCommunity?.isPrivate ? <Lock size={16} /> : <Globe size={16} />}
                  {currentCommunity?.isPrivate ? 'Make Public' : 'Make Private'}
                </button>
              </div>
            )}

            {activeTab === 'members' && (
              <div>
                <input type="text" placeholder="Search members..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className={styles.memberSearch} />
                <div className={styles.filterChips}>
                  {(['all', 'active', 'pending', 'banned'] as const).map((f) => (
                    <button key={f} className={`${styles.filterChip} ${memberFilter === f ? styles.filterChipActive : styles.filterChipInactive}`} onClick={() => setMemberFilter(f)}>
                      {f}
                    </button>
                  ))}
                </div>

                {(() => {
                  const q = memberSearch.trim().toLowerCase();
                  const visible = pendingMembers.filter((m) => {
                    if (memberFilter === 'active' && m.status !== 'active') return false;
                    if (memberFilter === 'pending' && m.status !== 'pending') return false;
                    if (memberFilter === 'banned' && !m.isBanned && m.status !== 'removed') return false;
                    if (q && !m.userName.toLowerCase().includes(q)) return false;
                    return true;
                  });

                  if (visible.length === 0) return <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No members match.</p>;

                  return visible.map((member) => (
                    <div key={member.id} className={styles.memberRow}>
                      <div className={styles.avatar}>
                        {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : member.userName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={styles.memberName}>{member.userName}</div>
                        <div className={styles.memberMeta}>
                          <span className={styles.roleBadge}>{member.role}</span>
                          {member.status === 'pending' && <span className={styles.statusBadgePending}>pending</span>}
                          {member.status === 'removed' && <span className={styles.statusBadgeBanned}>removed</span>}
                          {member.isBanned && <span className={styles.statusBadgeBanned}>banned</span>}
                        </div>
                      </div>

                      {member.status === 'pending' ? (
                        <>
                          <button className={styles.iconBtn} onClick={() => handleApproveMember(member.userId)} style={{ color: 'var(--color-success, #16a34a)', backgroundColor: '#dcfce7' }}><CheckCircle2 size={16} /></button>
                          <button className={styles.iconBtn} onClick={() => handleRejectMember(member.userId)} style={{ color: '#ef4444', backgroundColor: '#fee2e2' }}><XCircle size={16} /></button>
                        </>
                      ) : (
                        <>
                          <select value={member.role} onChange={(e) => handleRoleChange(member.userId, e.target.value as any)} className={`${styles.input} ${styles.selectSmall}`}>
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                          {member.status !== 'removed' && !member.isBanned && (
                            <button className={styles.iconBtn} onClick={() => handleRemoveMember(member.userId)}><XCircle size={16} /></button>
                          )}
                          {!member.isBanned && (
                            <button className={styles.iconBtn} style={{ color: '#ef4444' }} onClick={() => handleBanMember(member.userId)}><Ban size={16} /></button>
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
                  <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No comments</p>
                ) : (
                  recentComments.map((comment) => (
                    <div key={comment.id} className={styles.card}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>{comment.authorName}</span>
                        <button className={styles.iconBtn} style={{ color: '#ef4444' }} onClick={() => handleDeleteComment(comment.id)}><Trash2 size={14} /></button>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>{comment.content}</p>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Community Settings</h3>
                
                <label className={styles.label}>Cover Image</label>
                <div style={{ marginBottom: '1rem' }}>
                  {settingsCoverUrl ? (
                    <img src={settingsCoverUrl} alt="Cover" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: '0.75rem', marginBottom: '0.5rem' }} />
                  ) : (
                    <div style={{ width: '100%', height: 140, borderRadius: '0.75rem', backgroundColor: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>No cover set</div>
                  )}
                  <label className={styles.secondaryBtn} style={{ display: 'inline-flex', width: 'auto', cursor: coverUploading ? 'wait' : 'pointer' }}>
                    <Upload size={14} />
                    {coverUploading ? 'Uploading...' : 'Change Cover'}
                    <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={coverUploading} style={{ display: 'none' }} />
                  </label>
                </div>

                <label className={styles.label}>Name</label>
                <input type="text" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} className={styles.input} />

                <label className={styles.label}>Description</label>
                <textarea value={settingsDescription} onChange={(e) => setSettingsDescription(e.target.value)} rows={3} className={styles.textarea} />

                <label className={styles.label}>Rules (one per line)</label>
                <textarea value={settingsRules} onChange={(e) => setSettingsRules(e.target.value)} rows={4} placeholder={'Be respectful\nNo spam\nStay on topic'} className={styles.textarea} />

                <label className={styles.label}>Country</label>
                <input type="text" value={settingsCountry} onChange={(e) => setSettingsCountry(e.target.value)} className={styles.input} />

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className={styles.label}>State</label>
                    <input type="text" value={settingsState} onChange={(e) => setSettingsState(e.target.value)} className={styles.input} style={{ marginBottom: 0 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className={styles.label}>City</label>
                    <input type="text" value={settingsCity} onChange={(e) => setSettingsCity(e.target.value)} className={styles.input} style={{ marginBottom: 0 }} />
                  </div>
                </div>

                <div className={styles.toggleRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.toggleLabel}>Allow member connections</div>
                    <div className={styles.toggleSub}>Members can send "Get to Know" requests from your community page</div>
                  </div>
                  <button type="button" role="switch" aria-checked={settingsAllowConnections} onClick={() => setSettingsAllowConnections((v) => !v)} className={`${styles.toggle} ${settingsAllowConnections ? styles.toggleOn : ''}`}>
                    <span className={`${styles.toggleThumb} ${settingsAllowConnections ? styles.toggleThumbOn : ''}`} />
                  </button>
                </div>

                <button className={styles.primaryBtn} onClick={handleSaveSettings} disabled={settingsSaving || !settingsName.trim()}>
                  <Save size={16} />
                  {settingsSaving ? 'Saving...' : 'Save Changes'}
                </button>

                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Link2 size={16} color="var(--color-text-secondary)" />
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: 0, flex: 1 }}>Invite Links</h4>
                    <button className={styles.createButton} style={{ backgroundColor: '#111827', color: '#fff', padding: '0.375rem 0.75rem' }} onClick={handleGenerateInvite} disabled={inviteLoading}>
                      {inviteLoading ? 'Creating...' : 'Generate'}
                    </button>
                  </div>

                  {invites.length === 0 ? (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>No active invites. Generate one to share.</p>
                  ) : (
                    invites.map((inv) => (
                      <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', backgroundColor: 'var(--color-surface-alt)', borderRadius: '0.625rem', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>/join/{inv.token.slice(0, 12)}…</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>{inv.expiresAt ? `Expires ${new Date(inv.expiresAt).toLocaleDateString()}` : 'No expiry'}{' · '}Used {inv.useCount}{inv.maxUses ? `/${inv.maxUses}` : ''}</div>
                        </div>
                        <button className={styles.iconBtn} onClick={() => handleCopyInvite(inv.token)}><Copy size={14} /></button>
                        <button className={styles.iconBtn} style={{ color: '#ef4444' }} onClick={() => handleRevokeInvite(inv.id)}><Trash2 size={14} /></button>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-primary-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <AlertTriangle size={16} color="#ef4444" />
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ef4444', margin: 0 }}>Danger Zone</h4>
                  </div>

                  {currentCommunity?.status === 'archived' ? (
                    <button className={styles.secondaryBtn} style={{ borderColor: '#10b981', color: '#10b981', marginBottom: '0.5rem' }} onClick={handleUnarchive} disabled={dangerLoading}>
                      <Archive size={14} /> Unarchive Community
                    </button>
                  ) : (
                    <button className={styles.secondaryBtn} style={{ borderColor: '#f59e0b', color: '#f59e0b', marginBottom: '0.5rem' }} onClick={handleArchive} disabled={dangerLoading}>
                      <Archive size={14} /> Archive Community
                    </button>
                  )}

                  <button className={styles.secondaryBtn} style={{ backgroundColor: 'var(--color-primary-soft)', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => setDeleteConfirmOpen(true)}>
                    <Trash2 size={14} /> Delete Community
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem' }}>
                  {([7, 30] as const).map((r) => (
                    <button key={r} className={`${styles.filterChip} ${analyticsRange === r ? styles.filterChipActive : styles.filterChipInactive}`} onClick={() => setAnalyticsRange(r)}>
                      Last {r} days
                    </button>
                  ))}
                </div>

                {analyticsLoading || !analytics ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>Loading analytics...</div>
                ) : (
                  <>
                    <div className={styles.chartCard}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.125rem' }}>Member growth</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0 0 0.875rem' }}>
                        {(() => {
                          const arr = analyticsRange === 7 ? analytics.memberGrowth7d : analytics.memberGrowth30d;
                          const sum = arr.reduce((a: number, b: number) => a + b, 0);
                          return `+${sum} new member${sum === 1 ? '' : 's'} in the last ${analyticsRange} days`;
                        })()}
                      </p>
                      <MiniBarChart data={analyticsRange === 7 ? analytics.memberGrowth7d : analytics.memberGrowth30d} color="#10b981" />
                    </div>

                    <div className={styles.chartCard}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.125rem' }}>Post volume</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0 0 0.875rem' }}>
                        {(() => {
                          const arr = analyticsRange === 7 ? analytics.postVolume7d : analytics.postVolume30d;
                          const sum = arr.reduce((a: number, b: number) => a + b, 0);
                          return `${sum} post${sum === 1 ? '' : 's'} in the last ${analyticsRange} days`;
                        })()}
                      </p>
                      <MiniBarChart data={analyticsRange === 7 ? analytics.postVolume7d : analytics.postVolume30d} color="#ef4444" />
                    </div>

                    <div className={styles.chartCard}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.75rem' }}>Active vs inactive</h4>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div className={`${styles.statBlock} ${styles.statBlockGreen}`}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success, #16a34a)' }}>{analytics.activeCount}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--color-success-text, #166534)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Active</div>
                          <div style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>posted this week</div>
                        </div>
                        <div className={styles.statBlock}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>{analytics.inactiveCount}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Inactive</div>
                          <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>silent this week</div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.chartCard}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.75rem' }}>Top posts</h4>
                      {analytics.topPosts.length === 0 ? (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>No posts yet</p>
                      ) : (
                        analytics.topPosts.map((p: any, idx: number) => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: idx < analytics.topPosts.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.preview}</div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{p.likes} like{p.likes === 1 ? '' : 's'} · {p.comments} comment{p.comments === 1 ? '' : 's'}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className={styles.chartCard}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.75rem' }}>Top members</h4>
                      {analytics.topMembers.length === 0 ? (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>No activity yet</p>
                      ) : (
                        analytics.topMembers.map((m: any) => (
                          <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                            <div className={styles.avatar}>
                              {m.avatarUrl ? <img src={m.avatarUrl} alt="" /> : m.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{m.postCount} post{m.postCount === 1 ? '' : 's'}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className={styles.chartCard}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.75rem' }}>Recent joins</h4>
                      {analytics.recentJoins.length === 0 ? (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>No joins yet</p>
                      ) : (
                        analytics.recentJoins.map((m: any) => (
                          <div key={m.userId + m.joinedAt} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                            <div className={styles.avatar} style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                              {m.avatarUrl ? <img src={m.avatarUrl} alt="" /> : m.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Joined {new Date(m.joinedAt).toLocaleDateString()}</div>
                            </div>
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: m.role === 'admin' ? '#92400e' : m.role === 'moderator' ? '#1e40af' : 'var(--color-text-secondary)', background: m.role === 'admin' ? '#fef3c7' : m.role === 'moderator' ? '#dbeafe' : 'var(--color-surface-alt)', padding: '0.1875rem 0.5rem', borderRadius: '9999px', letterSpacing: '0.03em' }}>{m.role}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {deleteConfirmOpen && (
        <div className={styles.modalOverlay} onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmText(''); }}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={20} color="#ef4444" />
              <h3 className={styles.modalTitle}>Delete Community?</h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem', lineHeight: 1.5 }}>
              This permanently deletes <strong>{currentCommunity?.name}</strong>, all its members, posts, and invites. This cannot be undone.
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0 0 0.375rem' }}>
              Type <strong>{currentCommunity?.name}</strong> to confirm:
            </p>
            <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className={styles.input} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className={styles.secondaryBtn} onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmText(''); }}>Cancel</button>
              <button className={styles.primaryBtn} style={{ backgroundColor: deleteConfirmText === currentCommunity?.name ? '#ef4444' : 'var(--color-surface-alt)', color: deleteConfirmText === currentCommunity?.name ? '#fff' : 'var(--color-text-muted)' }} onClick={handleDeleteCommunity} disabled={dangerLoading || deleteConfirmText !== currentCommunity?.name}>
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
        onSuccess={() => { loadVipData(); loadMyRequests(); setCreateOpen(false); showToast('Request submitted', 'success'); }}
      />
    </div>
  );
};

const MiniBarChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(1, ...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 15 ? '2px' : '4px', height: 60, padding: '0 2px' }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(4, (v / max) * 100)}%`,
            background: v > 0 ? color : 'var(--color-surface-alt)',
            borderRadius: data.length > 15 ? 1 : 2,
            minWidth: 2,
            transition: 'height 0.2s ease',
          }}
          title={`${v}`}
        />
      ))}
    </div>
  );
};
