import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  AlertTriangle,
  FileText,
  Globe,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  verificationService,
  VerificationRequest,
  VerificationStats,
} from '@/services/verification.service';
import styles from './VerificationsPage.module.css';

const PAGE_SIZE = 20;

type Tab = 'pending' | 'approved' | 'rejected';

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  unverified: 'default',
};

export const VerificationsPage: React.FC = () => {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);

  const [items, setItems] = useState<VerificationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<VerificationStats>({
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0,
    totalApproved: 0,
  });

  const [selected, setSelected] = useState<VerificationRequest | null>(null);
  const [selfieSignedUrl, setSelfieSignedUrl] = useState<string | null>(null);
  const [idSignedUrl, setIdSignedUrl] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [statsData, listResult] = await Promise.all([
        verificationService.getStats(),
        verificationService.listByStatus(activeTab, {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
      ]);

      setStats(statsData);
      setItems(listResult.items);
      setTotal(listResult.total);
    } catch (err) {
      console.error('Failed to load verifications:', err);
      toast.error('Failed to load', 'Could not fetch verification queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetail = async (row: VerificationRequest) => {
    setSelected(row);
    setDetailLoading(true);
    setSelfieSignedUrl(null);
    setIdSignedUrl(null);

    const [selfie, idDoc] = await Promise.all([
      verificationService.getSignedUrl(row.selfie_url),
      verificationService.getSignedUrl(row.id_document_url),
    ]);

    setSelfieSignedUrl(selfie);
    setIdSignedUrl(idDoc);
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelected(null);
    setSelfieSignedUrl(null);
    setIdSignedUrl(null);
    setShowRejectModal(false);
    setRejectReason('');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);

    const result = await verificationService.approve(selected.id);
    setActionLoading(false);

    if (!result.success) {
      toast.error('Approval failed', result.error || 'Unknown error');
      return;
    }

    toast.success('Approved', `${selected.user?.display_name || 'User'} is now verified.`);
    closeDetail();
    loadData(false);
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      toast.warning('Reason required', 'Please enter a rejection reason.');
      return;
    }

    setActionLoading(true);
    const result = await verificationService.reject(selected.id, rejectReason.trim());
    setActionLoading(false);

    if (!result.success) {
      toast.error('Rejection failed', result.error || 'Unknown error');
      return;
    }

    toast.success('Rejected', 'The user has been notified.');
    closeDetail();
    loadData(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Identity Verifications</h1>
          <p className={styles.subtitle}>
            Review selfie + government ID submissions. Approvals grant the verified badge.
          </p>
        </div>
        <button
          className={styles.refreshButton}
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><Clock size={20} /></div>
          <div>
            <div className={styles.statLabel}>Pending</div>
            <div className={styles.statValue}>{stats.pending}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><CheckCircle2 size={20} /></div>
          <div>
            <div className={styles.statLabel}>Approved today</div>
            <div className={styles.statValue}>{stats.approvedToday}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><XCircle size={20} /></div>
          <div>
            <div className={styles.statLabel}>Rejected today</div>
            <div className={styles.statValue}>{stats.rejectedToday}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><ShieldCheck size={20} /></div>
          <div>
            <div className={styles.statLabel}>Total verified</div>
            <div className={styles.statValue}>{stats.totalApproved}</div>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        {(['pending', 'approved', 'rejected'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
            onClick={() => {
              setActiveTab(t);
              setPage(0);
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader size="lg" text="Loading queue..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={40} />}
          title={activeTab === 'pending' ? 'No pending submissions' : `No ${activeTab} submissions`}
          description={
            activeTab === 'pending'
              ? 'New identity verification requests will appear here.'
              : 'Nothing to show for this tab.'
          }
        />
      ) : (
        <>
          <div className={styles.list}>
            {items.map((row) => (
              <div key={row.id} className={styles.card} onClick={() => openDetail(row)}>
                <div className={styles.cardLeft}>
                  <Avatar
                    src={row.user?.avatar_url || undefined}
                    name={row.user?.display_name || 'User'}
                    size="md"
                  />
                  <div>
                    <div className={styles.cardName}>
                      {row.user?.display_name || 'Unknown user'}
                    </div>
                    <div className={styles.cardMeta}>
                      <Globe size={12} /> {row.country_code}
                      <span className={styles.dot}>·</span>
                      <FileText size={12} /> {(row.id_document_type || 'id').replace(/_/g, ' ')}
                      <span className={styles.dot}>·</span>
                      {new Date(row.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <Badge variant={STATUS_BADGE[row.status] || 'default'} dot>
                    {row.status}
                  </Badge>
                  <Eye size={16} className={styles.eyeIcon} />
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className={styles.pageInfo}>
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <Modal
        open={!!selected}
        onClose={closeDetail}
        title={selected?.user?.display_name || 'Verification'}
        description={selected ? `Submitted ${new Date(selected.submitted_at).toLocaleString()}` : ''}
        size="xl"
      >
        {detailLoading ? (
          <Loader size="lg" text="Loading images..." />
        ) : selected ? (
          <div className={styles.detailBody}>
            <div className={styles.detailMeta}>
              <Badge variant={STATUS_BADGE[selected.status] || 'default'} dot>
                {selected.status}
              </Badge>
              <span className={styles.detailMetaItem}>
                <Globe size={14} /> {selected.country_code}
              </span>
              <span className={styles.detailMetaItem}>
                <FileText size={14} /> {(selected.id_document_type || 'id').replace(/_/g, ' ')}
              </span>
            </div>

            {selected.rejection_reason && (
              <div className={styles.rejectNote}>
                <AlertTriangle size={16} /> Previous rejection: {selected.rejection_reason}
              </div>
            )}

            <div className={styles.imageGrid}>
              <div className={styles.imagePane}>
                <div className={styles.imageLabel}>Selfie + hand</div>
                {selfieSignedUrl ? (
                  <img src={selfieSignedUrl} alt="Selfie" className={styles.image} />
                ) : (
                  <div className={styles.imageMissing}>Selfie unavailable</div>
                )}
              </div>
              <div className={styles.imagePane}>
                <div className={styles.imageLabel}>ID document</div>
                {idSignedUrl ? (
                  <img src={idSignedUrl} alt="ID document" className={styles.image} />
                ) : (
                  <div className={styles.imageMissing}>ID unavailable</div>
                )}
              </div>
            </div>

            {selected.status === 'pending' && (
              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                >
                  <XCircle size={16} /> Reject
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  loading={actionLoading}
                >
                  <CheckCircle2 size={16} /> Approve
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject verification"
        description="The user will be notified with this reason."
        size="md"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setShowRejectModal(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} loading={actionLoading}>
              Confirm rejection
            </Button>
          </div>
        }
      >
        <textarea
          className={styles.reasonTextarea}
          rows={4}
          placeholder="e.g. ID photo is blurry, face not clearly visible, document expired..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};