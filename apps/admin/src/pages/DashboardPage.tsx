import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { Card, Table } from '@dating-app/ui';
import styles from './DashboardPage.module.css';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalMatches: 0,
    pendingReports: 0,
    totalCommunities: 0,
  });
  
  useEffect(() => {
    const fetchStats = async () => {
      const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      const { count: matchCount } = await supabase.from('matches').select('*', { count: 'exact', head: true });
      const { count: reportCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: communityCount } = await supabase.from('communities').select('*', { count: 'exact', head: true });
      
      setStats({
        totalUsers: userCount || 0,
        totalPosts: postCount || 0,
        totalMatches: matchCount || 0,
        pendingReports: reportCount || 0,
        totalCommunities: communityCount || 0,
      });
    };
    
    fetchStats();
  }, []);
  
  const statCards = [
    { label: 'Total Users', value: stats.totalUsers },
    { label: 'Total Posts', value: stats.totalPosts },
    { label: 'Total Matches', value: stats.totalMatches },
    { label: 'Pending Reports', value: stats.pendingReports },
    { label: 'Communities', value: stats.totalCommunities },
  ];
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.statsGrid}>
        {statCards.map((stat) => (
          <Card key={stat.label} className={styles.statCard}>
            <p className={styles.statLabel}>{stat.label}</p>
            <p className={styles.statValue}>{stat.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};