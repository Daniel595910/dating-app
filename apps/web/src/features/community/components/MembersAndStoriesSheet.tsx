import React from 'react';
import { X, UserPlus, Eye, Plus } from 'lucide-react';
import { StoryAuthorSummary } from '../hooks/useStoryRings';
import styles from '../styles/MembersAndStoriesSheet.module.css';

interface Member {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

interface MembersAndStoriesSheetProps {
  open: boolean;
  onClose: () => void;
  members: Member[];
  allowConnections: boolean;
  onViewProfile: (userId: string) => void;
  onGetToKnow: (userId: string) => void;
  loadingUserId?: string | null;
  connectedUserIds?: string[];
  storyAuthors: StoryAuthorSummary[];
  currentUserId: string;
  onOpenStory: (authorId: string) => void;
  onCreateStory: () => void;
}

export const MembersAndStoriesSheet: React.FC<MembersAndStoriesSheetProps> = ({
  open,
  onClose,
  members,
  allowConnections,
  onViewProfile,
  onGetToKnow,
  loadingUserId,
  connectedUserIds = [],
  storyAuthors,
  currentUserId,
  onOpenStory,
  onCreateStory,
}) => {
  if (!open) return null;

  // Split current user from others
  const selfStory = storyAuthors.find((a) => a.is_self || a.author_id === currentUserId);
  const otherStories = storyAuthors
    .filter((a) => a.author_id !== currentUserId && !a.is_self)
    .sort((a, b) => {
      if (a.has_unseen !== b.has_unseen) return a.has_unseen ? -1 : 1;
      return new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime();
    });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <div style={{ minWidth: 0 }}>
            <h3 className={styles.title}>Community</h3>
            <p className={styles.subtitle}>
              {members.length} member{members.length === 1 ? '' : 's'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.scrollBody}>
          {/* Stories tray */}
          <div className={styles.storiesSection}>
            <p className={styles.sectionLabel}>Stories</p>
            <div className={styles.storiesTray}>
              {/* Your Story tile */}
              <button
                className={styles.storyTile}
                onClick={() => {
                  if (selfStory) onOpenStory(currentUserId);
                  else onCreateStory();
                }}
              >
                <div className={styles.storyAvatarWrap}>
                  {selfStory ? (
                    <div className={selfStory.has_unseen ? styles.ringUnseen : styles.ringSeen}>
                      <div className={styles.ringInner}>
                        {selfStory.author_avatar ? (
                          <img src={selfStory.author_avatar} alt="" className={styles.storyAvatar} />
                        ) : (
                          <div className={styles.storyAvatarFallback}>
                            {selfStory.author_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.storyAvatarNoRing}>
                      <Plus size={22} style={{ color: 'var(--color-primary, #ef4444)' }} />
                    </div>
                  )}
                  <div
                    className={styles.addBadge}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateStory();
                    }}
                    role="button"
                    aria-label="Create story"
                  >
                    +
                  </div>
                </div>
                <span className={`${styles.storyName} ${selfStory ? '' : styles.storyNameMuted}`}>
                  Your Story
                </span>
              </button>

              {/* Other authors */}
              {otherStories.map((author) => (
                <button
                  key={author.author_id}
                  className={styles.storyTile}
                  onClick={() => onOpenStory(author.author_id)}
                >
                  <div className={styles.storyAvatarWrap}>
                    <div className={author.has_unseen ? styles.ringUnseen : styles.ringSeen}>
                      <div className={styles.ringInner}>
                        {author.author_avatar ? (
                          <img src={author.author_avatar} alt="" className={styles.storyAvatar} />
                        ) : (
                          <div className={styles.storyAvatarFallback}>
                            {author.author_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={styles.storyName}>{author.author_name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Members grid */}
          <div className={styles.membersSection}>
            <p className={styles.sectionLabel}>Community Members</p>
            <div className={styles.membersGrid}>
              {members.length === 0 ? (
                <p className={styles.emptyMembers}>No members to show.</p>
              ) : (
                members.map((m) => (
                  <div key={m.userId} className={styles.memberCard}>
                    <div className={styles.memberAvatar}>
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.name} />
                      ) : (
                        m.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <p className={styles.memberName} title={m.name}>
                      {m.name}
                    </p>
                    <div className={styles.memberActions}>
                      <button
                        className={styles.viewProfileBtn}
                        onClick={() => onViewProfile(m.userId)}
                      >
                        <Eye size={12} />
                        View Profile
                      </button>
                      {allowConnections && !connectedUserIds.includes(m.userId) && (
                        <button
                          className={styles.getToKnowBtn}
                          onClick={() => onGetToKnow(m.userId)}
                          disabled={loadingUserId === m.userId}
                        >
                          <UserPlus size={12} />
                          {loadingUserId === m.userId ? 'Sending...' : 'Get to Know'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};