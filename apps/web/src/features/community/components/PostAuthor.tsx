import React from 'react';
import { MapPin, BadgeCheck } from 'lucide-react';
import { CommunityPostAuthor } from '../../types/community.types';
import styles from '../styles/PostAuthor.module.css';

interface PostAuthorProps {
  author: CommunityPostAuthor;
  onProfileClick: (authorId: string) => void;
}

export const PostAuthor: React.FC<PostAuthorProps> = ({ author, onProfileClick }) => {
  return (
    <button className={styles.authorClickable} onClick={() => onProfileClick(author.id)}>
      <div className={styles.avatar}>
        {author.avatarUrl ? (
          <img src={author.avatarUrl} alt={author.name} />
        ) : (
          author.name.charAt(0).toUpperCase()
        )}
      </div>
      <div className={styles.authorInfo}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{author.name}</span>
          {author.verified && <BadgeCheck size={16} className={styles.verifiedIcon} />}
        </div>
        {author.location && (
          <div className={styles.locationRow}>
            <MapPin size={10} />
            <span>{author.location}</span>
          </div>
        )}
      </div>
    </button>
  );
};
