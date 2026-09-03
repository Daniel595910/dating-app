import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { Table } from '@dating-app/ui';
import styles from './VipPage.module.css';

export const VipPage: React.FC = () => {
  const [vipAccounts, setVipAccounts] = useState < any[] > ([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchVipAccounts = async () => {
      const { data } = await supabase
        .from('vip_accounts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      setVipAccounts(data || []);
      setLoading(false);
    };
    
    fetchVipAccounts();
  }, []);
  
  const columns = [
    { key: 'level', header: 'Level' },
    { key: 'points_balance', header: 'Points Balance' },
    { key: 'total_points_earned', header: 'Total Earned' },
    { key: 'total_points_spent', header: 'Total Spent' },
    {
      key: 'plan_expires_at',
      header: 'Plan Expires',
      render: (row: any) => row.plan_expires_at ? new Date(row.plan_expires_at).toLocaleDateString() : 'N/A',
    },
  ];
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>VIP Management</h1>
      <Table
        columns={columns}
        data={vipAccounts}
        loading={loading}
        emptyMessage="No VIP accounts found"
      />
    </div>
  );
};