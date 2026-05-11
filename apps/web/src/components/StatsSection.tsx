import { memo } from "react";
import {
  Activity,
  Eye,
  LinkIcon,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react";
import type { DashboardStats } from "../types";
import { formatNumber } from "../utils";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
  loading?: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  loading = false,
}: StatCardProps) {
  return (
    <div className="card glass relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-30 ${accent}`}
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ${accent.replace(
            "bg-",
            "text-"
          )}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="relative mt-3">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-white/5" />
        ) : (
          <p className="text-3xl font-semibold tracking-tight text-white">
            {formatNumber(value)}
          </p>
        )}
      </div>
    </div>
  );
}

interface StatsSectionProps {
  stats: DashboardStats;
  loading?: boolean;
}

function StatsSectionBase({ stats, loading = false }: StatsSectionProps) {
  return (
    <section
      aria-label="Dashboard statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        label="Total Cloaked URLs"
        value={stats.total}
        icon={LinkIcon}
        accent="bg-brand-500"
        loading={loading}
      />
      <StatCard
        label="Active Redirects"
        value={stats.active}
        icon={Activity}
        accent="bg-emerald-500"
        loading={loading}
      />
      <StatCard
        label="Today's Clicks"
        value={stats.todayClicks}
        icon={MousePointerClick}
        accent="bg-amber-500"
        loading={loading}
      />
      <StatCard
        label="Unique Visitors"
        value={stats.uniqueVisitors}
        icon={Eye}
        accent="bg-purple-500"
        loading={loading}
      />
    </section>
  );
}

export const StatsSection = memo(StatsSectionBase);
