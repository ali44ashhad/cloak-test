import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api";
import type { CloakedUrl, CloakedUrlInput, DashboardStats } from "../types";

const STATS_POLL_INTERVAL_MS = 8000;

const EMPTY_STATS: DashboardStats = {
  total: 0,
  active: 0,
  todayClicks: 0,
  uniqueVisitors: 0,
};

export interface UseLinksReturn {
  links: CloakedUrl[];
  stats: DashboardStats;
  loading: boolean;
  refreshing: boolean;
  error: ApiError | null;
  createLink: (input: CloakedUrlInput) => Promise<CloakedUrl>;
  setActive: (id: string, active: boolean) => Promise<void>;
  removeLink: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLinks(): UseLinksReturn {
  const [links, setLinks] = useState<CloakedUrl[]>([]);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [linksResult, statsResult] = await Promise.all([
        api.listLinks(),
        api.getStats(),
      ]);
      if (!mountedRef.current) return;
      setLinks(linksResult.links);
      setStats(statsResult);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(
          new ApiError(
            err instanceof Error ? err.message : "Failed to load data.",
            0
          )
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, STATS_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const createLink = useCallback(
    async (input: CloakedUrlInput): Promise<CloakedUrl> => {
      const { link } = await api.createLink(input);
      setLinks((prev) => [link, ...prev]);
      void refresh();
      return link;
    },
    [refresh]
  );

  const setActive = useCallback(
    async (id: string, active: boolean): Promise<void> => {
      setLinks((prev) =>
        prev.map((link) => (link.id === id ? { ...link, active } : link))
      );
      try {
        await api.updateLink(id, { active });
        void refresh();
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh]
  );

  const removeLink = useCallback(
    async (id: string): Promise<void> => {
      setLinks((prev) => prev.filter((link) => link.id !== id));
      try {
        await api.deleteLink(id);
        void refresh();
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh]
  );

  return {
    links,
    stats,
    loading,
    refreshing,
    error,
    createLink,
    setActive,
    removeLink,
    refresh,
  };
}
