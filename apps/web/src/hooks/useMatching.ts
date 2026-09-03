/**
 * useMatching Hook
 * Matching system management
 */

import { useState, useCallback } from 'react';
import { Match, MatchRequest } from '@dating-app/types';
import { matchingService } from '@/services/matching.service';

interface UseMatchingReturn {
  matches: Match[];
  pendingRequests: MatchRequest[];
  loading: boolean;
  error: string | null;
  loadMatches: (userId: string) => Promise < void > ;
  loadPendingRequests: (userId: string) => Promise < void > ;
  sendMatchRequest: (requesterId: string, targetId: string, message ? : string) => Promise < MatchRequest | null > ;
  acceptRequest: (requestId: string) => Promise < boolean > ;
  rejectRequest: (requestId: string) => Promise < boolean > ;
}

export function useMatching(): UseMatchingReturn {
  const [matches, setMatches] = useState < Match[] > ([]);
  const [pendingRequests, setPendingRequests] = useState < MatchRequest[] > ([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const loadMatches = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const userMatches = await matchingService.getUserMatches(userId);
      setMatches(userMatches);
    } catch (err: any) {
      setError(err.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const loadPendingRequests = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const requests = await matchingService.getPendingRequests(userId);
      setPendingRequests(requests);
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const sendMatchRequest = useCallback(async (requesterId: string, targetId: string, message ? : string) => {
    setError(null);
    
    try {
      return await matchingService.sendMatchRequest(requesterId, targetId, message);
    } catch (err: any) {
      setError(err.message || 'Failed to send match request');
      return null;
    }
  }, []);
  
  const acceptRequest = useCallback(async (requestId: string) => {
    setError(null);
    
    try {
      const success = await matchingService.acceptMatchRequest(requestId);
      if (success) {
        setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to accept request');
      return false;
    }
  }, []);
  
  const rejectRequest = useCallback(async (requestId: string) => {
    setError(null);
    
    try {
      const success = await matchingService.rejectMatchRequest(requestId);
      if (success) {
        setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to reject request');
      return false;
    }
  }, []);
  
  return {
    matches,
    pendingRequests,
    loading,
    error,
    loadMatches,
    loadPendingRequests,
    sendMatchRequest,
    acceptRequest,
    rejectRequest,
  };
}