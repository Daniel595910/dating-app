import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, RefreshCw, Search, ChevronLeft, ChevronRight,
  ExternalLink, CheckCircle, XCircle, Loader, Coins, Crown,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Loader as LoaderIcon } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  paymentsService,
  AdminPaymentRow,
  PaymentKind,
  PaymentStatus,
} from '@/services/payments.service';
import styles from './VipPage.module.css';

const PAGE_SIZE = 25;

type StatusTab = PaymentStatus | 'all';

export const PaymentsPage: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [items, setItems] = useState<AdminPaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [kindFilter, setKindFilter] = useState<PaymentKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<AdminPaymentRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState<
    | { type: 'mark-success'; row: AdminPaymentRow }
    | { type: 'mark-failed'; row: AdminPaymentRow }
    | null
  >(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);

        const result = await paymentsService.list({
          kind: kindFilter,
          status: statusFilter,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });

        let filtered = result.items;
        if (debouncedSearch.trim()) {
          const term = debouncedSearch.toLowerCase();
          filtered = filtered.filter(
            (r) =>
              r.paystack_reference.toLowerCase().includes(term) ||
              (r.user?.display_name || '').toLowerCase().includes(term) ||
              (r.plan_code || '').toLowerCase().includes(term) ||
              (r.pack_code || '').toLowerCase().includes(term)
          );
        }

        setItems(filtered);
        setTotal(result.total);
      } catch (err: any) {
        toast.error('Failed to load payments', err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [kindFilter, statusFilter, debouncedSearch, page, toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [kindFilter, statusFilter, debouncedSearch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(false);
    toast.success('Refreshed');
  };

  const handleMarkSuccess = async (row: AdminPaymentRow) => {
    setActionLoading(true);
    try {
      await paymentsService.markSuccess(row.id, row.kind);
      toast.success('Marked as success');
      setConfirm(null);
      setSelected(null);
      load(false);
    } catch (err: any) {
      toast.error('Action failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkFailed = async (row: AdminPaymentRow) => {
    setActionLoading(true);
    try {
      await paymentsService.markFailed(row.id, row.kind, 'Manual admin action');
      toast.success('Marked as failed');
      setConfirm(null);
      setSelected(null);
      load(false);
    } catch (err: any) {
      toast.error('Action failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatNaira = (amount: number, currency: string): string => {
    if (currency === 'NGN') return `₦${(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    return `$${(amount / 100).toFixed(2)}`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success': return 'success' as const;
      case 'pending': return 'warning' as const;
      case 'failed': return 'error' as const;
      case 'abandoned': return 'default' as const;
      case 'reversed': return 'error' as const;
      default: return 'default' as const;
    }
  };

  const timeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Payments</h1>
          <p className={styles.subtitle}>
            {total > 0
              ? `${total.toLocaleString()} transactions`
              : 'Monitor Paystack transactions and manual approvals'}
          </p>
        </div>
        <button className={styles.refreshButton} onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          Refresh
        </button>
      </div>

      <div className={styles.filters} style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className={styles.searchWrapper} style={{ flex: '1 1 240px' }}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by reference, user, plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as any)}
          style={{ padding: '8px 12px', borderRadius: 8 }}
        >
          <option value="all">All kinds</option>
          <option value="vip">VIP subscriptions</option>
          <option value="credits">Credit packs</option>
        </select>
      </div>

      <div className={styles.filterTabs} style={{ marginBottom: 16 }}>
        {(['all', 'pending', 'success', 'failed', 'abandoned', 'reversed'] as StatusTab[]).map((s) => (
          <button
            key={s}
            className={`${styles.filterTab} ${statusFilter === s ? styles.filterTabActive : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <LoaderIcon fullScreen text="Loading payments..." />
      ) : items.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon={<DollarSign size={32} />}
            title="No payments found"
            description="No transactions match your filters."
          />
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>User</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className={styles.row}>
                    <td>
                      <Badge variant="default" size="sm">
                        {row.kind === 'vip' ? <Crown size={10} /> : <Coins size={10} />}
                        {' '}{row.kind}
                      </Badge>
                    </td>
                    <td>
                      <div className={styles.userCell}>
                        <Avatar
                          src={row.user?.avatar_url}
                          name={row.user?.display_name || 'User'}
                          size="sm"
                        />
                        <span className={styles.userName}>
                          {row.user?.display_name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td>{row.plan_code || row.pack_code || '—'}</td>
                    <td>{formatNaira(row.amount, row.currency)}</td>
                    <td>
                      <Badge variant={getStatusVariant(row.status)} size="sm">
                        {row.status}
                      </Badge>
                    </td>
                    <td className={styles.mono} style={{ fontSize: 12 }}>
                      {row.paystack_reference.slice(0, 30)}…
                    </td>
                    <td>{timeAgo(row.created_at)}</td>
                    <td>
                      <button
                        onClick={() => setSelected(row)}
                        style={{ padding: 4, background: 'transparent', border: 0, cursor: 'pointer' }}
                      >
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Payment Details"
        size="lg"
      >
        {selected && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong>Reference:</strong>
              <code style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                {selected.paystack_reference}
              </code>
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>User:</strong> {selected.user?.display_name || selected.user_id}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Product:</strong> {selected.kind} — {selected.plan_code || selected.pack_code}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Amount:</strong> {formatNaira(selected.amount, selected.currency)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Status:</strong> {selected.status}
            </div>
            {selected.paystack_transaction_id && (
              <div style={{ marginBottom: 16 }}>
                <strong>Paystack Tx ID:</strong> {selected.paystack_transaction_id}
              </div>
            )}
            {selected.paid_at && (
              <div style={{ marginBottom: 16 }}>
                <strong>Paid at:</strong> {new Date(selected.paid_at).toLocaleString()}
              </div>
            )}
            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <strong>Metadata:</strong>
                <pre style={{ fontSize: 11, overflow: 'auto', maxHeight: 200 }}>
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </div>
            )}

            {hasPermission('VIP_MANAGE') && selected.status !== 'success' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                <Button
                  variant="primary"
                  icon={<CheckCircle size={16} />}
                  onClick={() => setConfirm({ type: 'mark-success', row: selected })}
                  loading={actionLoading}
                  fullWidth
                >
                  Mark Success
                </Button>
                <Button
                  variant="danger"
                  icon={<XCircle size={16} />}
                  onClick={() => setConfirm({ type: 'mark-failed', row: selected })}
                  loading={actionLoading}
                  fullWidth
                >
                  Mark Failed
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm?.type === 'mark-success'}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && handleMarkSuccess(confirm.row)}
        title="Mark payment as success?"
        description="This will flag the payment as successful in the DB. NOTE: this does NOT activate the subscription or credit the user — use the VIP page for that."
        confirmText="Mark Success"
        variant="info"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={confirm?.type === 'mark-failed'}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && handleMarkFailed(confirm.row)}
        title="Mark payment as failed?"
        description="This will flag the payment as failed in the DB."
        confirmText="Mark Failed"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};
