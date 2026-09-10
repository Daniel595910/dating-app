import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Heart,
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Loader } from '@/components/ui/Loader';
import { Card } from '@/components/ui/Card';
import { LineChart } from '@/components/ui/LineChart';
import { BarChart } from '@/components/ui/BarChart';
import {
  analyticsService,
  AnalyticsOverview,
  TimeSeriesPoint,
  DemographicsData,
} from '@/services/analytics.service';
import styles from './AnalyticsPage.module.css';

type RangeOption = 7 | 14 | 30 | 60 | 90;

export const AnalyticsPage: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<RangeOption>(30);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [userGrowth, setUserGrowth] = useState<TimeSeriesPoint[]>([]);
  const [postActivity, setPostActivity] = useState<TimeSeriesPoint[]>([]);
  const [matchActivity, setMatchActivity] = useState<TimeSeriesPoint[]>([]);
  const [demographics, setDemographics] = useState<DemographicsData | null>(null);

  const loadAnalytics = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [overviewData, usersSeries, postsSeries, matchesSeries, demographicsData] =
        await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getUserGrowthSeries(range),
          analyticsService.getPostActivitySeries(range),
          analyticsService.getMatchActivitySeries(range),
          analyticsService.getDemographics(),
        ]);

      setOverview(overviewData);
      setUserGrowth(usersSeries);
      setPostActivity(postsSeries);
      setMatchActivity(matchesSeries);
      setDemographics(demographicsData);
    } catch (err: any) {
      toast.error('Failed to load analytics', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [range]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics(false);
    toast.success('Analytics refreshed');
  };

  if (loading) return <Loader fullScreen text="Loading analytics..." />;

  if (!overview) {
    return (
      <div className={styles.container}>
        <p>Failed to load analytics</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: overview.users.total,
      today: overview.users.today,
      growth: overview.users.growth,
      icon: <Users size={20} />,
      color: 'blue',
    },
    {
      label: 'Total Posts',
      value: overview.posts.total,
      today: overview.posts.today,
      growth: overview.posts.growth,
      icon: <FileText size={20} />,
      color: 'purple',
    },
    {
      label: 'Total Matches',
      value: overview.matches.total,
      today: overview.matches.today,
      growth: overview.matches.growth,
      icon: <Heart size={20} />,
      color: 'pink',
    },
    {
      label: 'Active Now',
      value: overview.engagement.activeUsers,
      today: 0,
      growth: 0,
      icon: <Activity size={20} />,
      color: 'green',
    },
  ];

  const genderData = Object.entries(demographics?.gender || {}).map(([label, value]) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value,
  }));

  const ageData = Object.entries(demographics?.ageRanges || {}).map(([label, value]) => ({
    label,
    value,
  }));

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>Track platform growth and engagement</p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.rangeSelector}>
            {([7, 14, 30, 60, 90] as RangeOption[]).map((r) => (
              <button
                key={r}
                className={`${styles.rangeButton} ${range === r ? styles.rangeButtonActive : ''}`}
                onClick={() => setRange(r)}
              >
                {r}d
              </button>
            ))}
          </div>
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className={styles.statsGrid}>
        {statCards.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={`${styles.statIcon} ${styles[`statIcon${stat.color.charAt(0).toUpperCase() + stat.color.slice(1)}`]}`}>
                {stat.icon}
              </div>
              {stat.growth !== 0 && (
                <div className={`${styles.growthBadge} ${stat.growth > 0 ? styles.growthPositive : styles.growthNegative}`}>
                  {stat.growth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(stat.growth)}%
                </div>
              )}
            </div>
            <p className={styles.statLabel}>{stat.label}</p>
            <p className={styles.statValue}>{stat.value.toLocaleString()}</p>
            {stat.today > 0 && (
              <p className={styles.statToday}>+{stat.today} today</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <Card
          title="User Growth"
          subtitle={`New users over the last ${range} days`}
          padding="lg"
        >
          <LineChart
            data={userGrowth}
            color="#3b82f6"
            height={220}
            showArea
          />
        </Card>

        <Card
          title="Post Activity"
          subtitle={`Posts created over the last ${range} days`}
          padding="lg"
        >
          <LineChart
            data={postActivity}
            color="#8b5cf6"
            height={220}
            showArea
          />
        </Card>

        <Card
          title="Match Activity"
          subtitle={`Matches made over the last ${range} days`}
          padding="lg"
        >
          <LineChart
            data={matchActivity}
            color="#ec4899"
            height={220}
            showArea
          />
        </Card>

        <Card
          title="Gender Distribution"
          subtitle="User breakdown by gender"
          padding="lg"
        >
          {genderData.length > 0 ? (
            <BarChart data={genderData} color="#10b981" />
          ) : (
            <p className={styles.noData}>No demographic data available</p>
          )}
        </Card>

        <Card
          title="Age Distribution"
          subtitle="User breakdown by age group"
          padding="lg"
        >
          {ageData.some((d) => d.value > 0) ? (
            <BarChart data={ageData} color="#f59e0b" />
          ) : (
            <p className={styles.noData}>No age data available</p>
          )}
        </Card>

        <Card
          title="Top Countries"
          subtitle="Users by country"
          padding="lg"
        >
          {demographics && demographics.topCountries.length > 0 ? (
            <div className={styles.countryList}>
              {demographics.topCountries.map((c, i) => (
                <div key={i} className={styles.countryItem}>
                  <div className={styles.countryRank}>#{i + 1}</div>
                  <Globe size={14} className={styles.countryIcon} />
                  <span className={styles.countryName}>{c.country}</span>
                  <span className={styles.countryCount}>{c.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noData}>No location data available</p>
          )}
        </Card>

        <Card
          title="Top Interests"
          subtitle="Most popular user interests"
          padding="lg"
        >
          {demographics && demographics.topInterests.length > 0 ? (
            <div className={styles.interestTags}>
              {demographics.topInterests.map((i, idx) => (
                <div key={idx} className={styles.interestTag}>
                  <Sparkles size={12} />
                  <span>{i.interest}</span>
                  <span className={styles.interestCount}>{i.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noData}>No interest data available</p>
          )}
        </Card>
      </div>
    </div>
  );
};
