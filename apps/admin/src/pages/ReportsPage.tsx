import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { Table } from '@dating-app/ui';
import styles from './ReportsPage.module.css';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState < any[] > ([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      setReports(data || []);
      setLoading(false);
    };
    
    fetchReports();
  }, []);
  
  const columns = [
    { key: 'type', header: 'Type' },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status' },
    { key: 'severity', header: 'Severity' },
    {
      key: 'description',
      header: 'Description',
      render: (row: any) => row.description?.substring(0, 100) || '',
    },
    {
      key: 'created_at',
      header: 'Created At',
      render: (row: any) => new Date(row.created_at).toLocaleDateString(),
    },
  ];
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Reports</h1>
      <Table
        columns={columns}
        data={reports}
        loading={loading}
        emptyMessage="No reports found"
      />
    </div>
  );
};