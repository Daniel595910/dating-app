import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { Table, Button } from '@dating-app/ui';
import styles from './ModerationPage.module.css';

export const ModerationPage: React.FC = () => {
  const [flaggedContent, setFlaggedContent] = useState < any[] > ([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchFlaggedContent = async () => {
      const { data: flaggedPosts } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'flagged');
      
      const { data: flaggedComments } = await supabase
        .from('comments')
        .select('*')
        .eq('status', 'flagged');
      
      const combined = [
        ...(flaggedPosts || []).map((p: any) => ({ ...p, contentType: 'Post' })),
        ...(flaggedComments || []).map((c: any) => ({ ...c, contentType: 'Comment' })),
      ];
      
      setFlaggedContent(combined);
      setLoading(false);
    };
    
    fetchFlaggedContent();
  }, []);
  
  const handleApprove = async (id: string, type: string) => {
    const table = type === 'Post' ? 'posts' : 'comments';
    await supabase.from(table).update({ status: 'published' }).eq('id', id);
    setFlaggedContent((prev) => prev.filter((item) => item.id !== id));
  };
  
  const handleRemove = async (id: string, type: string) => {
    const table = type === 'Post' ? 'posts' : 'comments';
    await supabase.from(table).update({ status: 'deleted' }).eq('id', id);
    setFlaggedContent((prev) => prev.filter((item) => item.id !== id));
  };
  
  const columns = [
    { key: 'contentType', header: 'Type' },
    {
      key: 'content',
      header: 'Content',
      render: (row: any) => row.content?.substring(0, 100) || '',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button size="sm" variant="outline" onClick={() => handleApprove(row.id, row.contentType)}>
            Approve
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleRemove(row.id, row.contentType)}>
            Remove
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Content Moderation</h1>
      <Table
        columns={columns}
        data={flaggedContent}
        loading={loading}
        emptyMessage="No flagged content"
      />
    </div>
  );
};