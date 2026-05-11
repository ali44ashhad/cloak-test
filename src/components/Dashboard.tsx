import { useCallback, useMemo, useState } from "react";
import { Github, Link2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { ApiError } from "../api";
import { useLinks } from "../hooks/useLinks";
import type {
  CloakedUrl,
  CloakedUrlInput,
  ConfirmAction,
} from "../types";
import { formatNumber } from "../utils";
import { ConfirmModal } from "./ConfirmModal";
import { StatsSection } from "./StatsSection";
import { UrlForm } from "./UrlForm";
import { UrlTable } from "./UrlTable";

export function Dashboard() {
  const {
    links,
    stats,
    loading,
    refreshing,
    error,
    createLink,
    setActive,
    removeLink,
    refresh,
  } = useLinks();

  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [deleting, setDeleting] = useState(false);

  const existingSlugs = useMemo(
    () => new Set(links.map((row) => row.slug.toLowerCase())),
    [links]
  );

  const handleCreate = useCallback(
    async (input: CloakedUrlInput) => {
      setSubmitting(true);
      try {
        await createLink({
          botUrl: input.botUrl.trim(),
          userUrl: input.userUrl.trim(),
          slug: input.slug.trim(),
          campaignName: input.campaignName.trim(),
        });
        toast.success("Cloaked URL generated.");
      } catch (err) {
        if (err instanceof ApiError) {
          throw new Error(err.message);
        }
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [createLink]
  );

  const handleToggleActive = useCallback(
    async (id: string, active: boolean) => {
      try {
        await setActive(id, active);
        toast(active ? "Redirect activated." : "Redirect paused.", {
          icon: active ? "🟢" : "⏸️",
        });
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to update redirect status."
        );
      }
    },
    [setActive]
  );

  const handleRequestDelete = useCallback(
    (id: string) => {
      const target = links.find((row) => row.id === id);
      if (!target) return;
      setConfirm({
        kind: "delete",
        id,
        campaignName: target.campaignName || target.slug,
      });
    },
    [links]
  );

  const handleConfirm = useCallback(async () => {
    if (!confirm) return;
    if (confirm.kind === "delete") {
      setDeleting(true);
      try {
        await removeLink(confirm.id);
        toast.success(`Deleted "${confirm.campaignName}".`);
        setConfirm(null);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete link."
        );
      } finally {
        setDeleting(false);
      }
    } else {
      setConfirm(null);
    }
  }, [confirm, removeLink]);

  const handleShowAnalytics = useCallback((row: CloakedUrl) => {
    toast(
      `${row.campaignName || row.slug}: ${formatNumber(
        row.clicks
      )} clicks · ${formatNumber(row.uniqueVisitors)} unique`,
      { icon: "📊", duration: 3500 }
    );
  }, []);

  return (
    <div className="relative min-h-full bg-gray-950 bg-grid-fade">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(17, 24, 39, 0.92)",
            color: "#f9fafb",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            fontSize: "0.875rem",
            borderRadius: "0.75rem",
          },
          success: { iconTheme: { primary: "#34d399", secondary: "#0b1020" } },
          error: { iconTheme: { primary: "#f87171", secondary: "#0b1020" } },
        }}
      />

      <header className="border-b border-white/5 bg-gray-950/70 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 shadow-glow">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight">
                Cloak
              </h1>
              <p className="text-xs text-gray-400 -mt-0.5">
                URL cloaking management dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Bot detection on
            </span>
            <button
              type="button"
              onClick={() => {
                void refresh();
              }}
              disabled={loading || refreshing}
              className="btn-ghost"
              aria-label="Refresh data"
              title="Refresh data"
            >
              <RefreshCw
                className={[
                  "h-4 w-4",
                  refreshing ? "animate-spin" : "",
                ].join(" ")}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <a
              className="btn-ghost"
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Documentation"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6 lg:space-y-8 animate-fade-in">
        {error ? (
          <div
            role="alert"
            className="card border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center justify-between gap-3"
          >
            <span>
              Couldn&apos;t reach the API: {error.message}
            </span>
            <button
              type="button"
              onClick={() => {
                void refresh();
              }}
              className="btn-ghost"
            >
              Retry
            </button>
          </div>
        ) : null}

        <StatsSection stats={stats} loading={loading} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 xl:col-span-4">
            <UrlForm
              existingSlugs={existingSlugs}
              onSubmit={handleCreate}
              submitting={submitting}
            />
          </div>
          <div className="lg:col-span-7 xl:col-span-8">
            {loading && links.length === 0 ? (
              <div className="card glass flex items-center justify-center gap-3 px-6 py-16 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
                Loading cloaked URLs…
              </div>
            ) : (
              <UrlTable
                rows={links}
                onToggleActive={handleToggleActive}
                onDelete={handleRequestDelete}
                onShowAnalytics={handleShowAnalytics}
              />
            )}
          </div>
        </div>

        <footer className="pt-4 pb-2 text-center text-xs text-gray-500">
          Backed by the local Express + SQLite server. Click counts and
          visitors are updated every few seconds.
        </footer>
      </main>

      <ConfirmModal
        open={confirm?.kind === "delete"}
        title="Delete cloaked URL?"
        message={
          confirm?.kind === "delete"
            ? `This will permanently remove "${confirm.campaignName}" and stop all redirects. This action cannot be undone.`
            : ""
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        destructive
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!deleting) setConfirm(null);
        }}
      />
    </div>
  );
}
