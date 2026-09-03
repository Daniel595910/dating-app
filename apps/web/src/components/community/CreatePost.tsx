/**\n * CreatePost Component
 * Modal for creating new posts
 */

import React, { useState } from 'react';
import { supabase } from '@/config/supabase.client';
import { APP_LIMITS } from '@/config/constants';
import { Modal, Button, Input } from '@dating-app/ui';
import styles from './CreatePost.module.css';

interface CreatePostProps {
  open: boolean;
  onClose: () => void;
  communityId: string;
  onPostCreated?: () => void;
}

export const CreatePost: React.FC<CreatePostProps> = ({
  open,
  onClose,
  communityId,
  onPostCreated,
}) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<string>('introduction');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Post content is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const tagArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const { error: insertError } = await supabase.from('posts').insert({
        community_id: communityId,
        author_id: user.id,
        type,
        content: content.trim(),
        tags: tagArray,
        status: 'published',
      });

      if (insertError) throw insertError;

      setContent('');
      setTags('');
      setType('introduction');
      onPostCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Post"
      description="Share something with your community"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Post
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <div className={styles.typeSelector}>
          {['introduction', 'looking_for', 'discussion', 'question'].map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.typeButton} ${type === t ? styles.typeButtonActive : ''}`}
              onClick={() => setType(t)}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <Input
          textarea
          label="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          required
          maxLength={APP_LIMITS.POST_CONTENT_MAX_LENGTH}
          error={error || undefined}
          helperText={`${content.length}/${APP_LIMITS.POST_CONTENT_MAX_LENGTH}`}
        />

        <Input
          label="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="music, travel, food"
        />
      </div>
    </Modal>
  );
};

