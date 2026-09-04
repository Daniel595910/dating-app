import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Search, Users, MapPin, Star, Lock, Globe } from 'lucide-react';

interface DiscoverCommunity {
  id: string;
  name: string;
  slug: string;
  type: string;
  country: string;
  state: string | null;
  city: string | null;
  memberCount: number;
  isPrivate: boolean;
  isSponsored: boolean;
}

export const DiscoverCommunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [communities, setCommunities] = useState<DiscoverCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCommunities();
  }, [user]);

  const loadCommunities = async () => {
    if (!user) return;

    // Get user's country
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('location')
      .eq('user_id', user.id)
      .single();

    const userCountry = userProfile?.location?.country || 'Nigeria';

    // Get all communities in user's country
    const { data: communities } = await supabase
      .from('communities')
      .select('*')
      .eq('country', userCountry)
      .eq('status', 'active')
      .order('member_count', { ascending: false });

    // Get user's joined communities
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id);

    setJoinedIds(new Set((memberships || []).map((m: any) => m.community_id)));
    setCommunities(communities || []);
    setLoading(false);
  };

  const handleJoin = async (communityId: string) => {
    if (!user) return;

    await supabase.from('community_members').insert({
      community_id: communityId,
      user_id: user.id,
      role: 'member',
    });

    setJoinedIds((prev) => new Set([...prev, communityId]));
  };

  const handleEnterCommunity = (communityId: string) => {
    navigate('/community/' + communityId);
  };

  const filteredCommunities = searchTerm
    ? communities.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.state && c.state.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : communities;

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#faf9f7', maxWidth: 480, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', paddingTop: 'calc(0.625rem + env(safe-area-inset-top))', backgroundColor: '#ffffff', borderBottom: '1px solid #f3f4f6' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111827', padding: '0.5rem', borderRadius: '9999px', minWidth: 44, minHeight: 44 }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '9999px', padding: '0 1rem', minHeight: 44 }}>
          <Search size={18} style={{ color: '#9ca3af' }} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search communities..."
            style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '0.9375rem', fontFamily: 'inherit' }}
          />
        </div>
      </header>

      <div style={{ padding: '1rem' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 0.75rem' }}>
          Discover Communities
        </h1>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</p>
        ) : filteredCommunities.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>No communities found</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredCommunities.map((community) => {
              const isJoined = joinedIds.has(community.id);
              return (
                <div key={community.id} style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1rem', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: 0, flex: 1 }}>
                      {community.name}
                    </h3>
                    {community.isSponsored && (
                      <span style={{ padding: '0.25rem 0.625rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600 }}>
                        ⭐ Sponsored
                      </span>
                    )}
                    {community.isPrivate ? <Lock size={14} style={{ color: '#f59e0b' }} /> : <Globe size={14} style={{ color: '#10b981' }} />}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} />
                      {[community.city, community.state, community.country].filter(Boolean).join(', ')}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users size={12} />
                      {community.memberCount} members
                    </span>
                  </div>

                  {isJoined ? (
                    <button
                      onClick={() => handleEnterCommunity(community.id)}
                      style={{ width: '100%', padding: '0.625rem', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
                    >
                      Enter Community
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(community.id)}
                      style={{ width: '100%', padding: '0.625rem', background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
                    >
                      Join Community
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
