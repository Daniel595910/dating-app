import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  Users,
  Search,
  Plus,
  MoreVertical,
  Activity,
  Crown,
  UserCog,
  UserX,
  Check,
  X,
  RefreshCw,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  adminUsersService,
  AdminUser,
  AdminRole,
  AdminActivity,
} from '@/services/adminUsers.service';
import styles from './AdminUsersPage.module.css';

const ROLE_INFO: Record<AdminRole, { label: string; color: string; description: string }> = {
  super_admin: {
    label: 'Super Admin',
    color: '#ef4444',
    description: 'Full system access including admin management',
  },
  admin: {
    label: 'Admin',
    color: '#f59e0b',
    description: 'Manage users, content, communities, and settings',
  },
  moderator: {
    label: 'Moderator',
    color: '#3b82f6',
    description: 'Moderate content and handle reports',
  },
  support_agent: {
    label: 'Support Agent',
    color: '#10b981',
    description: 'View and assist users, handle verification',
  },
  analyst: {
    label: 'Analyst',
    color: '#8b5cf6',
    description: 'View analytics and reports only',
  },
};

const PAGE_SIZE = 20;

export const AdminUsersPage: React.FC = () => {
  const { adminUser, isSuperAdmin, hasPermission } = useAdminAuth();
  const toast = useToast();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminRole | 'all'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Activity modal
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0 });
  const [activityLoading, setActivityLoading] = useState(false);

  // Role change modal
  const [roleChangeUser, setRoleChangeUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<AdminRole>('moderator');
  const [actionLoading, setActionLoading] = useState(false);

  // Add admin modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [promoteSearch, setPromoteSearch] = useState('');
  const [promoteResults, setPromoteResults] = useState<AdminUser[]>([]);
  const [promoteRole, setPromoteRole] = useState<AdminRole>('moderator');
  const [promoteUser, setPromoteUser] = useState<AdminUser | null>(null);
  const [searching, setSearching] = useState(false);

  // Confirm action
  const [confirmAction, setConfirmAction] = useState<{
    type: 'revoke' | 'role';
    user: AdminUser;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadAdmins = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const result = await adminUsersService.getAdmins({
        search: debouncedSearch,
        role: roleFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      setAdmins(result.items);
      setTotal(result.total);
    } catch (err: any) {
      toast.error('Failed to load admins', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, roleFilter, page, toast]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, roleFilter]);

  // Promote search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (promoteSearch.trim().length < 2) {
        setPromoteResults([]);
        return;
      }
      setSearching(true);
      const results = await adminUsersService.searchNonAdminUsers(promoteSearch);
      setPromoteResults(results);
      setSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [promoteSearch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAdmins(false);
    toast.success('Refreshed');
  };

  const handleViewActivity = async (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setActivityLoading(true);

    try {
      const [activityData, statsData] = await Promise.all([
        adminUsersService.getAdminActivity(admin.user_id, 15),
        adminUsersService.getAdminStats(admin.user_id),
      ]);
      setActivities(activityData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleRoleChange = async (user: AdminUser, role: AdminRole) => {
    setActionLoading(true);
    try {
      await adminUsersService.updateRole(user.user_id, role);
      setAdmins((prev) =>
        prev.map((a) => (a.user_id === user.user_id ? { ...a, role } : a))
      );
      toast.success(`Role updated to ${ROLE_INFO[role].label}`);
      setConfirmAction(null);
      setRoleChangeUser(null);
    } catch (err: any) {
      toast.error('Role change failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (user: AdminUser) => {
    setActionLoading(true);
    try {
      await adminUsersService.revokeAdmin(user.user_id);
      setAdmins((prev) => prev.filter((a) => a.user_id !== user.user_id));
      toast.success('Admin access revoked');
      setConfirmAction(null);
    } catch (err: any) {
      toast.error('Revoke failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!promoteUser) return;

    setActionLoading(true);
    try {
      await adminUsersService.promoteToAdmin(promoteUser.user_id, promoteRole);
      toast.success(`${promoteUser.display_name} is now ${ROLE_INFO[promoteRole].label}`);
      setShowAddModal(false);
      setPromoteUser(null);
      setPromoteSearch('');
      setPromoteResults([]);
      loadAdmins(false);
    } catch (err: any) {
      toast.error('Promotion failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: AdminRole): 'error' | 'warning' | 'info' | 'success' | 'default' | 'primary' => {
    switch (role) {
      case 'super_admin': return 'error';
      case 'admin': return 'warning';
      case 'moderator': return 'info';
      case 'support_agent': return 'success';
      case 'analyst': return 'primary';
      default: return 'default';
    }
  };

  const timeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Users</h1>
          <p className={styles.subtitle}>Manage admin accounts and permissions</p>
        </div>
        <div className={styles.headerActions}>
          {isSuperAdmin && (
            <Button
              icon={<Plus size={16} />}
              onClick={() => setShowAddModal(true)}
            >
              Add Admin
            </Button>
          )}
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search admins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterTabs}>
          <button
            className={`${styles.filterTab} ${roleFilter === 'all' ? styles.filterTabActive : ''}`}
            onClick={() => setRoleFilter('all')}
          >
            All
          </button>
          {(Object.keys(ROLE_INFO) as AdminRole[]).map((role) => (
            <button
              key={role}
              className={`${styles.filterTab} ${roleFilter === role ? styles.filterTabActive : ''}`}
              onClick={() => setRoleFilter(role)}
            >
              {ROLE_INFO[role].label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <Loader fullScreen text="Loading admins..." />
      ) : admins.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon={<Shield size={32} />}
            title={debouncedSearch ? 'No matching admins' : 'No admins found'}
            description={
              debouncedSearch
                ? 'Try a different search term'
                : 'Admins will appear here once they are promoted'
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.adminsGrid}>
            {admins.map((admin) => {
              const roleInfo = ROLE_INFO[admin.role];
              const isSelf = admin.user_id === adminUser?.user_id;
              const isSuperAdminRow = admin.role === 'super_admin';

              return (
                <div key={admin.id} className={styles.adminCard}>
                  <div className={styles.adminHeader}>
                    <Avatar
                      src={admin.avatar_url}
                      name={admin.display_name || 'Admin'}
                      size="lg"
                    />
                    <div className={styles.adminInfo}>
                      <div className={styles.nameRow}>
                        <span className={styles.adminName}>
                          {admin.display_name || 'Unnamed'}
                        </span>
                        {isSelf && <Badge variant="info" size="sm">You</Badge>}
                      </div>
                      <Badge variant={getRoleBadgeVariant(admin.role)} size="sm">
                        <Shield size={10} /> {roleInfo?.label || admin.role}
                      </Badge>
                    </div>

                    {isSuperAdmin && !isSelf && (
                      <div className={styles.menuWrapper}>
                        <button
                          className={styles.menuButton}
                          onClick={() => setOpenMenuId(openMenuId === admin.id ? null : admin.id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === admin.id && (
                          <>
                            <div className={styles.menuOverlay} onClick={() => setOpenMenuId(null)} />
                            <div className={styles.menu}>
                              <button
                                className={styles.menuItem}
                                onClick={() => {
                                  handleViewActivity(admin);
                                  setOpenMenuId(null);
                                }}
                              >
                                <Activity size={14} /> View activity
                              </button>
                              <button
                                className={styles.menuItem}
                                onClick={() => {
                                  setRoleChangeUser(admin);
                                  setNewRole(admin.role);
                                  setOpenMenuId(null);
                                }}
                              >
                                <UserCog size={14} /> Change role
                              </button>
                              {!isSuperAdminRow && (
                                <button
                                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                  onClick={() => {
                                    setConfirmAction({ type: 'revoke', user: admin });
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <UserX size={14} /> Revoke admin
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <p className={styles.roleDescription}>{roleInfo?.description}</p>

                  <div className={styles.adminFooter}>
                    <button
                      className={styles.activityButton}
                      onClick={() => handleViewActivity(admin)}
                    >
                      <Activity size={12} /> View activity
                    </button>
                    <span className={styles.adminSince}>
                      Since {new Date(admin.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Activity Modal */}
      <Modal
        open={!!selectedAdmin}
        onClose={() => {
          setSelectedAdmin(null);
          setActivities([]);
          setStats({ total: 0, today: 0, week: 0 });
        }}
        title={`${selectedAdmin?.display_name || 'Admin'} — Activity`}
        description="Recent admin actions"
        size="lg"
      >
        {activityLoading ? (
          <Loader text="Loading activity..." />
        ) : (
          <div className={styles.activityModal}>
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <TrendingUp size={16} />
                <div>
                  <span className={styles.statBoxLabel}>Total Actions</span>
                  <span className={styles.statBoxValue}>{stats.total}</span>
                </div>
              </div>
              <div className={styles.statBox}>
                <Clock size={16} />
                <div>
                  <span className={styles.statBoxLabel}>Today</span>
                  <span className={styles.statBoxValue}>{stats.today}</span>
                </div>
              </div>
              <div className={styles.statBox}>
                <Activity size={16} />
                <div>
                  <span className={styles.statBoxLabel}>This Week</span>
                  <span className={styles.statBoxValue}>{stats.week}</span>
                </div>
              </div>
            </div>

            <div className={styles.activityList}>
              {activities.length === 0 ? (
                <div className={styles.noActivity}>
                  <Activity size={24} />
                  <p>No activity recorded</p>
                </div>
              ) : (
                activities.map((activity, i) => (
                  <div key={i} className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      <Activity size={12} />
                    </div>
                    <div className={styles.activityInfo}>
                      <span className={styles.activityAction}>{activity.action}</span>
                      <span className={styles.activityResource}>
                        {activity.resource_type}
                      </span>
                    </div>
                    <span className={styles.activityTime}>
                      {timeAgo(activity.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Role change modal */}
      <Modal
        open={!!roleChangeUser}
        onClose={() => setRoleChangeUser(null)}
        title="Change Role"
        description={`Update role for ${roleChangeUser?.display_name}`}
      >
        <div className={styles.roleSelect}>
          {(Object.keys(ROLE_INFO) as AdminRole[]).map((role) => (
            <button
              key={role}
              className={`${styles.roleOption} ${newRole === role ? styles.roleOptionActive : ''}`}
              onClick={() => setNewRole(role)}
            >
              <div className={styles.roleOptionHeader}>
                <span
                  className={styles.roleIndicator}
                  style={{ background: ROLE_INFO[role].color }}
                />
                <span className={styles.roleOptionLabel}>{ROLE_INFO[role].label}</span>
                {newRole === role && <Check size={16} />}
              </div>
              <span className={styles.roleOptionDescription}>
                {ROLE_INFO[role].description}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setRoleChangeUser(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => roleChangeUser && handleRoleChange(roleChangeUser, newRole)}
            loading={actionLoading}
            disabled={newRole === roleChangeUser?.role}
          >
            Update Role
          </Button>
        </div>
      </Modal>

      {/* Add admin modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setPromoteSearch('');
          setPromoteResults([]);
          setPromoteUser(null);
          setPromoteRole('moderator');
        }}
        title="Add Admin"
        description="Search for a user and promote them to admin"
      >
        <div className={styles.promoteForm}>
          {!promoteUser ? (
            <>
              <div className={styles.searchWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search user by name..."
                  value={promoteSearch}
                  onChange={(e) => setPromoteSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {searching && (
                <div className={styles.searchingText}>Searching...</div>
              )}

              {promoteResults.length > 0 && (
                <div className={styles.searchResults}>
                  {promoteResults.map((user) => (
                    <button
                      key={user.id}
                      className={styles.searchResultItem}
                      onClick={() => setPromoteUser(user)}
                    >
                      <Avatar
                        src={user.avatar_url}
                        name={user.display_name || 'User'}
                        size="sm"
                      />
                      <span className={styles.searchResultName}>
                        {user.display_name || 'Unnamed'}
                      </span>
                      <Plus size={14} />
                    </button>
                  ))}
                </div>
              )}

              {promoteSearch.length >= 2 && !searching && promoteResults.length === 0 && (
                <div className={styles.noResults}>No users found</div>
              )}
            </>
          ) : (
            <>
              <div className={styles.selectedUser}>
                <Avatar
                  src={promoteUser.avatar_url}
                  name={promoteUser.display_name || 'User'}
                  size="md"
                />
                <div className={styles.selectedUserInfo}>
                  <span className={styles.selectedUserName}>{promoteUser.display_name}</span>
                  <span className={styles.selectedUserRole}>Will be promoted</span>
                </div>
                <button
                  className={styles.clearSelection}
                  onClick={() => setPromoteUser(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className={styles.roleSelect}>
                {(Object.keys(ROLE_INFO) as AdminRole[]).map((role) => (
                  <button
                    key={role}
                    className={`${styles.roleOption} ${promoteRole === role ? styles.roleOptionActive : ''}`}
                    onClick={() => setPromoteRole(role)}
                  >
                    <div className={styles.roleOptionHeader}>
                      <span
                        className={styles.roleIndicator}
                        style={{ background: ROLE_INFO[role].color }}
                      />
                      <span className={styles.roleOptionLabel}>{ROLE_INFO[role].label}</span>
                      {promoteRole === role && <Check size={16} />}
                    </div>
                    <span className={styles.roleOptionDescription}>
                      {ROLE_INFO[role].description}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.modalActions}>
          <Button
            variant="secondary"
            onClick={() => {
              setShowAddModal(false);
              setPromoteUser(null);
              setPromoteSearch('');
              setPromoteResults([]);
            }}
          >
            Cancel
          </Button>
          {promoteUser && (
            <Button
              variant="primary"
              onClick={handlePromote}
              loading={actionLoading}
            >
              Promote to {ROLE_INFO[promoteRole].label}
            </Button>
          )}
        </div>
      </Modal>

      {/* Revoke confirm */}
      <ConfirmDialog
        open={confirmAction?.type === 'revoke'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleRevoke(confirmAction.user)}
        title="Revoke admin access?"
        description={`${confirmAction?.user.display_name} will lose all admin privileges and become a regular user.`}
        confirmText="Revoke Access"
        variant="danger"
        requireTyping="REVOKE"
        loading={actionLoading}
      />
    </div>
  );
};
