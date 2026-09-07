import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, X, MapPin, BadgeCheck, Users, Crown, SlidersHorizontal, ChevronDown, Map as MapIcon, List } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/ProfileSwipeDeck.module.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ProfileSwipeDeckProps {
  userId: string;
  communityId: string;
}

interface ProfileCard {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  age: number | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  bio: string | null;
  interests: string[];
  relationshipIntent: string | null;
  verified: boolean;
  distanceKm: number | null;
}

interface FilterOptions {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  verifiedOnly: boolean;
}

export const ProfileSwipeDeck: React.FC<ProfileSwipeDeckProps> = ({ userId, communityId }) => {
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ProfileCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'swipe' | 'map'>('swipe');
  const [swipe, setSwipe] = useState({ isDragging: false, startX: 0, deltaX: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    minAge: 18,
    maxAge: 60,
    maxDistance: 50,
    verifiedOnly: false,
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cardBackground, setCardBackground] = useState<string>('linear-gradient(135deg, #fecaca 0%, #f87171 100%)');
  const cardRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const getDominantColor = (imgUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 50;
          canvas.height = 50;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 50, 50);
            const imageData = ctx.getImageData(0, 0, 50, 50).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < imageData.length; i += 4) {
              if (imageData[i + 3] > 100) {
                r += imageData[i];
                g += imageData[i + 1];
                b += imageData[i + 2];
                count++;
              }
            }
            if (count > 0) {
              resolve(`linear-gradient(135deg, rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}) 0%, rgba(255,255,255,0.8) 100%)`);
            } else {
              resolve('linear-gradient(135deg, #fecaca 0%, #f87171 100%)');
            }
          } else {
            resolve('linear-gradient(135deg, #fecaca 0%, #f87171 100%)');
          }
        } catch {
          resolve('linear-gradient(135deg, #fecaca 0%, #f87171 100%)');
        }
      };
      img.onerror = () => resolve('linear-gradient(135deg, #fecaca 0%, #f87171 100%)');
      img.src = imgUrl;
    });
  };

  const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const geocodeLocation = async (city: string, state: string, country: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const query = [city, state, country].filter(Boolean).join(', ');
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch {
      return null;
    }
  };

  const fetchProfileShares = useCallback(async () => {
    setLoading(true);
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('community_id', communityId)
        .eq('type', 'profile_share')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!posts || posts.length === 0) {
        setProfiles([]);
        setFilteredProfiles([]);
        return;
      }

      const authorIds = [...new Set(posts.map((p: any) => p.author_id))];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', authorIds);

      const profileMap = new Map();
      (profilesData || []).forEach((p: any) => {
        profileMap.set(p.user_id, p);
      });

      const currentUserProfile = profileMap.get(userId);
      if (currentUserProfile?.location) {
        const userGeo = await geocodeLocation(
          currentUserProfile.location.city,
          currentUserProfile.location.state,
          currentUserProfile.location.country
        );
        if (userGeo) setUserLocation(userGeo);
      }

      const cards: ProfileCard[] = [];
      
      for (const post of posts.filter((p: any) => p.author_id !== userId)) {
        const prof = profileMap.get(post.author_id);
        const metadata = post.metadata || {};
        
        let lat = null;
        let lng = null;
        let distance = null;
        
        if (prof?.location) {
          const geo = await geocodeLocation(
            prof.location.city,
            prof.location.state,
            prof.location.country
          );
          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
            if (userLocation) {
              distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
            }
          }
        }

        cards.push({
          id: post.id,
          userId: post.author_id,
          displayName: prof?.display_name || metadata.displayName || 'User',
          avatarUrl: prof?.avatar_url || post.images?.[0] || null,
          age: prof?.birth_date ? calculateAge(prof.birth_date) : metadata.age || null,
          location: prof?.location ? [prof.location.city, prof.location.state].filter(Boolean).join(', ') : null,
          city: prof?.location?.city || null,
          state: prof?.location?.state || null,
          country: prof?.location?.country || null,
          lat,
          lng,
          bio: prof?.bio || post.content || null,
          interests: prof?.interests || metadata.interests || [],
          relationshipIntent: prof?.relationship_intent || null,
          verified: prof?.is_verified || false,
          distanceKm: distance,
        });
      }

      setProfiles(cards);
      setFilteredProfiles(cards);
    } catch (err) {
      console.error('Failed to fetch profile shares:', err);
    } finally {
      setLoading(false);
    }
  }, [communityId, userId]);

  useEffect(() => {
    fetchProfileShares();
  }, [fetchProfileShares]);

  useEffect(() => {
    const filtered = profiles.filter((profile) => {
      if (profile.age !== null && profile.age !== undefined) {
        if (profile.age < filters.minAge || profile.age > filters.maxAge) return false;
      }
      if (filters.verifiedOnly && !profile.verified) return false;
      if (profile.distanceKm !== null && profile.distanceKm > filters.maxDistance) return false;
      return true;
    });
    setFilteredProfiles(filtered);
    setCurrentIndex(0);
  }, [filters, profiles]);

  // Update card background when current profile changes
  useEffect(() => {
    const current = filteredProfiles[currentIndex];
    if (current?.avatarUrl) {
      getDominantColor(current.avatarUrl).then((color) => setCardBackground(color));
    } else {
      setCardBackground('linear-gradient(135deg, #fecaca 0%, #f87171 100%)');
    }
  }, [currentIndex, filteredProfiles]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipe({ isDragging: true, startX: e.touches[0].clientX, deltaX: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipe.isDragging) return;
    const deltaX = e.touches[0].clientX - swipe.startX;
    setSwipe((prev) => ({ ...prev, deltaX }));
    if (Math.abs(deltaX) > 30) setSwipeDirection(deltaX > 0 ? 'right' : 'left');
  };

  const handleTouchEnd = () => {
    if (!swipe.isDragging) return;
    const threshold = 100;
    if (swipe.deltaX < -threshold || swipe.deltaX > threshold) {
      setCurrentIndex((prev) => prev + 1);
    }
    setSwipe({ isDragging: false, startX: 0, deltaX: 0 });
    setSwipeDirection(null);
  };

  const initializeMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const center = userLocation || { lat: 9.0765, lng: 7.3986 };
    const map = L.map(mapRef.current).setView([center.lat, center.lng], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
  }, [userLocation]);

  useEffect(() => {
    if (viewMode === 'map' && filteredProfiles.length > 0) {
      setTimeout(() => {
        initializeMap();
        if (mapInstanceRef.current) {
          markersRef.current.forEach((m) => m.remove());
          markersRef.current = [];

          filteredProfiles.forEach((profile) => {
            if (profile.lat && profile.lng) {
              const marker = L.marker([profile.lat, profile.lng])
                .addTo(mapInstanceRef.current!)
                .bindPopup(`<b>${profile.displayName}</b>${profile.age ? `<br>Age: ${profile.age}` : ''}${profile.distanceKm ? `<br>${profile.distanceKm} km away` : ''}`);
              markersRef.current.push(marker);
            }
          });

          if (markersRef.current.length > 0 && userLocation) {
            const bounds = L.latLngBounds([
              [userLocation.lat, userLocation.lng],
              ...filteredProfiles.filter(p => p.lat && p.lng).map(p => [p.lat!, p.lng!] as [number, number])
            ]);
            mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
          }
        }
      }, 100);
    }
  }, [viewMode, filteredProfiles, initializeMap, userLocation]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleCloseMap = () => setViewMode('swipe');
  const handlePass = () => setCurrentIndex((prev) => prev + 1);
  const handleLike = () => setCurrentIndex((prev) => prev + 1);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading profiles...</p>
      </div>
    );
  }

  const current = filteredProfiles[currentIndex];

  return (
    <div className={styles.deckContainer}>
      <div className={styles.viewToggle}>
        <button 
          className={`${styles.viewButton} ${viewMode === 'swipe' ? styles.viewButtonActive : ''}`}
          onClick={() => setViewMode('swipe')}
        >
          <Heart size={16} /> Swipe
        </button>
        <button 
          className={`${styles.viewButton} ${viewMode === 'map' ? styles.viewButtonActive : ''}`}
          onClick={() => setViewMode('map')}
        >
          <MapIcon size={16} /> Map
        </button>
        <button className={styles.filterButton} onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {showFilters && (
        <div className={styles.filterPanel}>
          <div className={styles.filterRow}>
            <label className={styles.filterLabel}>Age: {filters.minAge} - {filters.maxAge}</label>
            <input type="range" min={18} max={60} value={filters.minAge} onChange={(e) => setFilters({ ...filters, minAge: Number(e.target.value) })} className={styles.rangeSlider} />
            <input type="range" min={18} max={60} value={filters.maxAge} onChange={(e) => setFilters({ ...filters, maxAge: Number(e.target.value) })} className={styles.rangeSlider} />
          </div>
          <div className={styles.filterRow}>
            <label className={styles.filterLabel}>Max Distance: {filters.maxDistance} km</label>
            <input type="range" min={5} max={200} step={5} value={filters.maxDistance} onChange={(e) => setFilters({ ...filters, maxDistance: Number(e.target.value) })} className={styles.rangeSlider} />
          </div>
          <div className={styles.filterRow}>
            <label className={styles.filterCheckbox}>
              <input type="checkbox" checked={filters.verifiedOnly} onChange={(e) => setFilters({ ...filters, verifiedOnly: e.target.checked })} />
              Verified only
            </label>
          </div>
        </div>
      )}

      {viewMode === 'map' ? (
        <div className={styles.mapView}>
          <button className={styles.closeMapButton} onClick={handleCloseMap} aria-label="Close map">
            <X size={20} />
          </button>
          <div ref={mapRef} className={styles.mapContainer} />
        </div>
      ) : current ? (
        <div 
          className={styles.deck}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            ref={cardRef}
            className={styles.card}
            style={{
              background: cardBackground,
              transform: `translateX(${swipe.deltaX}px) rotate(${swipe.deltaX * 0.05}deg)`,
              transition: swipe.isDragging ? 'none' : 'transform 0.3s ease',
            }}
          >
            <div className={styles.photoContainer}>
              {current.avatarUrl ? (
                <img src={current.avatarUrl} alt={current.displayName} className={styles.photo} />
              ) : (
                <div className={styles.photoFallback}>{current.displayName.charAt(0).toUpperCase()}</div>
              )}
            </div>

            <div className={styles.infoOverlay}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{current.displayName}{current.age ? `, ${current.age}` : ''}</span>
                {current.verified && <BadgeCheck size={18} className={styles.verifiedIcon} />}
              </div>
              {current.location && (
                <div className={styles.location}>
                  <MapPin size={12} />
                  {current.location}
                  {current.distanceKm && <span className={styles.distance}> • {current.distanceKm} km</span>}
                </div>
              )}
              {current.interests.length > 0 && (
                <div className={styles.interests}>
                  {current.interests.slice(0, 3).map((interest, index) => (
                    <span key={index} className={styles.interestTag}>{interest}</span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.actionButtons}>
              <button className={styles.passButton} onClick={handlePass}><X size={28} /></button>
              <button className={styles.likeButton} onClick={handleLike}><Heart size={28} /></button>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.empty}>
          <Users size={48} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No profiles match your filters</p>
        </div>
      )}
    </div>
  );
};

