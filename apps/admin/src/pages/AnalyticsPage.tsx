import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { Card } from '@dating-app/ui';
import styles from './AnalyticsPage.module.css';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState({
    usersToday: 0,
    usersThisWeek: 0,
    postsToday: 0,
    matchesToday: 0,
    revenueThisMonth: 0,
  });
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { count: usersToday } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart);
      
      const { count: usersThisWeek } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart);
      
      const { count: postsToday } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart);
      
      const { count: matchesToday } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart);
      
      setAnalytics({
        usersToday: usersToday || 0,
        usersThisWeek: usersThisWeek || 0,
        postsToday: postsToday || 0,
        matchesToday: matchesToday || 0,
        revenueThisMonth: 0,
      });
    };
    
    fetchAnalytics();
  }, []);
  
  const analyticsCards = [
    { label: 'New Users Today', value: analytics.usersToday },
    { label: 'New Users This Week', value: analytics.usersThisWeek },
    { label: 'Posts Today', value: analytics.postsToday },
    { label: 'Matches Today', value: analytics.matchesToday },
  ];
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Analytics</h1>
      <div className={styles.analyticsGrid}>
        {analyticsCards.map((item) => (
          <Card key={item.label} className={styles.analyticsCard}>
            <p className={styles.analyticsLabel}>{item.label}</p>
            <p className={styles.analyticsValue}>{item.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};