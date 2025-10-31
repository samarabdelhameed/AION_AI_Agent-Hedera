/**
 * useHedera Hook - React Hook for Hedera Integration
 */

import { useState, useEffect, useCallback } from 'react';
import { hederaService, HederaStatus, AIDecision } from '../services/hederaService';

export function useHederaStatus() {
  const [status, setStatus] = useState<HederaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await hederaService.getStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Hedera status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await refresh();
      }
    };
    
    loadData();
    
    // Refresh every 60 seconds (reduced frequency)
    const interval = setInterval(() => {
      if (mounted) {
        refresh();
      }
    }, 60000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []); // Remove refresh dependency to prevent infinite loop

  return { status, loading, error, refresh };
}

export function useHederaDecisions(filters?: {
  limit?: number;
  type?: string;
}) {
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await hederaService.getDecisions(filters);
      setDecisions(data.decisions);
      setHasMore(data.pagination.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch decisions');
    } finally {
      setLoading(false);
    }
  }, [filters?.limit, filters?.type]); // Only depend on filter values

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await refresh();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, []); // Load once on mount

  return { decisions, loading, error, hasMore, refresh };
}

export function useHederaHealth() {
  const [health, setHealth] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hederaService.getHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to fetch Hedera health:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await refresh();
      }
    };
    
    loadData();
    
    // Refresh every 2 minutes (reduced frequency)
    const interval = setInterval(() => {
      if (mounted) {
        refresh();
      }
    }, 120000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []); // Remove refresh dependency

  return { health, loading, refresh };
}

export function useHederaAnalytics() {
  const [analytics, setAnalytics] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hederaService.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch Hedera analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await refresh();
      }
    };
    
    loadData();
    
    // Refresh every 3 minutes (reduced frequency)
    const interval = setInterval(() => {
      if (mounted) {
        refresh();
      }
    }, 180000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []); // Remove refresh dependency

  return { analytics, loading, refresh };
}

export default { useHederaStatus, useHederaDecisions, useHederaHealth, useHederaAnalytics };

