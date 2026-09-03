import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { Table } from '@dating-app/ui';
import styles from './UsersPage.module.css';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState < any[] > ([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      setUsers(data || []);
      setLoading(false);
    };
    
    fetchUsers();
  }, []);
  
  const columns = [
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role' },
    { key: 'status', header: 'Status' },
    { key: 'verification_status', header: 'Verification' },
    {
      key: 'created_at',
      header: 'Created At',
      render: (row: any) => new Date(row.created_at).toLocaleDateString(),
    },
  ];
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Users</h1>
      <Table
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found"
      />
    </div>
  );
};