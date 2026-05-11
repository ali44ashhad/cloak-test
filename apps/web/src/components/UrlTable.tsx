import { memo, useState } from "react";
import {
  BarChart3,
  Bot,
  Check,
  Copy,
  ExternalLink,
  Inbox,
  Trash2,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import type { CloakedUrl } from "../types";
import { copyToClipboard, formatDate, formatNumber } from "../utils";
import { ToggleSwitch } from "./ToggleSwitch";

interface UrlTableProps {
  rows: CloakedUrl[];
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onShowAnalytics: (row: CloakedUrl) => void;
}

function UrlTableBase({
  rows,
  onToggleActive,
  onDelete,
  onShowAnalytics,
}: UrlTableProps) {
  return (
    <section className="card glass overflow-hidden">
      <header className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">Cloaked URLs</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {rows.length === 0
              ? "No links yet — generate your first one."
              : `${rows.length} link${rows.length === 1 ? "" : "s"} configured`}
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-gray-400">
              <tr className="border-b border-white/5">
                <th className="px-5 py-3 font-medium">Campaign</th>
                <th className="px-5 py-3 font-medium">Bot URL</th>
                <th className="px-5 py-3 font-medium">User URL</th>
                <th className="px-5 py-3 font-medium">Cloaked URL</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  onToggleActive={onToggleActive}
                  onDelete={onDelete}
                  onShowAnalytics={onShowAnalytics}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface RowProps {
  row: CloakedUrl;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onShowAnalytics: (row: CloakedUrl) => void;
}

function Row({ row, onToggleActive, onDelete, onShowAnalytics }: RowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(row.cloakedUrl);
      setCopied(true);
      toast.success("Cloaked URL copied to clipboard.");
      window.setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not copy to clipboard."
      );
    }
  };

  return (
    <tr className="group transition-colors hover:bg-white/[0.02]">
      <td className="px-5 py-4 align-top">
        <div className="font-medium text-white">
          {row.campaignName || (
            <span className="text-gray-500 italic">Untitled</span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-gray-500">
          {formatDate(row.createdAt)}
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <UrlCell label="Bot" url={row.botUrl} icon={<Bot className="h-3.5 w-3.5" />} />
      </td>

      <td className="px-5 py-4 align-top">
        <UrlCell
          label="User"
          url={row.userUrl}
          icon={<User className="h-3.5 w-3.5" />}
        />
      </td>

      <td className="px-5 py-4 align-top">
        <div className="flex items-center gap-2">
          <code className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-brand-300">
            /r/{row.slug}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="icon-btn"
            aria-label="Copy cloaked URL"
            title="Copy cloaked URL"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-1 truncate text-xs text-gray-500" title={row.cloakedUrl}>
          {row.cloakedUrl}
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="flex items-center gap-3">
          <ToggleSwitch
            checked={row.active}
            onChange={(next) => onToggleActive(row.id, next)}
            label={`Toggle ${row.campaignName || row.slug}`}
          />
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
              row.active
                ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20"
                : "bg-gray-700/40 text-gray-400 ring-1 ring-white/10",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                row.active ? "bg-emerald-400 animate-pulse" : "bg-gray-500",
              ].join(" ")}
            />
            {row.active ? "Active" : "Inactive"}
          </span>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            className="icon-btn"
            title="View analytics"
            aria-label="View analytics"
            onClick={() => onShowAnalytics(row)}
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(row.id)}
            className="icon-btn hover:!text-red-400 hover:!bg-red-500/10"
            title="Delete cloaked URL"
            aria-label="Delete cloaked URL"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function UrlCell({
  label,
  url,
  icon,
}: {
  label: string;
  url: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex max-w-[260px] flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-500">
        {icon}
        {label}
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group/link inline-flex items-center gap-1 truncate text-sm text-gray-200 hover:text-brand-300 transition-colors"
        title={url}
      >
        <span className="truncate">{url}</span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" />
      </a>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-gray-400">
        <Inbox className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-200">No cloaked URLs yet</p>
        <p className="mt-1 text-xs text-gray-500">
          Use the form on the left to generate your first cloaked link.
        </p>
      </div>
    </div>
  );
}

export const UrlTable = memo(UrlTableBase);

export function formatRowAnalyticsToast(row: CloakedUrl): string {
  return `${row.campaignName || row.slug}: ${formatNumber(
    row.clicks
  )} clicks · ${formatNumber(row.uniqueVisitors)} unique`;
}
