import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { Table, Button } from '@dating-app/ui';
import styles from './CommunitiesPage.module.css';

export const CommunitiesPage: React.FC = () => {
  const [communities, setCommunities] = useState < any[] > ([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchCommunities = async () => {
      const { data } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });
      
      setCommunities(data || []);
      setLoading(false);
    };
    
    fetchCommunities();
  }, []);
  
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    { key: 'type', header: 'Type' },
    { key: 'country', header: 'Country' },
    { key: 'member_count', header: 'Members' },
    { key: 'post_count', header: 'Posts' },
    { key: 'status', header: 'Status' },
  ];
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Communities</h1>
        <Button>Create Community</Button>
      </div>
      <Table
        columns={columns}
        data={communities}
        loading={loading}
        emptyMessage="No communities found"
      />
    </div>
  );
};