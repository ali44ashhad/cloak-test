import { useMemo, useState, type FormEvent } from "react";
import {
  Bot,
  Hash,
  Loader2,
  Megaphone,
  Shuffle,
  Sparkles,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import type { CloakedUrlFormErrors, CloakedUrlInput } from "../types";
import { generateSlug, sanitizeSlug, validateInput } from "../utils";

interface UrlFormProps {
  existingSlugs: Set<string>;
  onSubmit: (input: CloakedUrlInput) => Promise<void> | void;
  submitting?: boolean;
}

const EMPTY: CloakedUrlInput = {
  botUrl: "",
  userUrl: "",
  slug: "",
  campaignName: "",
};

export function UrlForm({
  existingSlugs,
  onSubmit,
  submitting = false,
}: UrlFormProps) {
  const [values, setValues] = useState<CloakedUrlInput>(EMPTY);
  const [errors, setErrors] = useState<CloakedUrlFormErrors>({});
  const [touched, setTouched] = useState<Set<keyof CloakedUrlInput>>(new Set());

  const liveErrors = useMemo(
    () => validateInput(values, existingSlugs),
    [values, existingSlugs]
  );

  const update = <K extends keyof CloakedUrlInput>(
    key: K,
    value: CloakedUrlInput[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const markTouched = (key: keyof CloakedUrlInput) => {
    setTouched((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const showError = (key: keyof CloakedUrlInput): string | undefined =>
    touched.has(key) || errors[key] ? liveErrors[key] : undefined;

  const handleRandomize = () => {
    let candidate = generateSlug();
    let safety = 0;
    while (existingSlugs.has(candidate) && safety < 10) {
      candidate = generateSlug();
      safety += 1;
    }
    update("slug", candidate);
    markTouched("slug");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(
      new Set<keyof CloakedUrlInput>([
        "botUrl",
        "userUrl",
        "slug",
        "campaignName",
      ])
    );
    const validation = validateInput(values, existingSlugs);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    try {
      await onSubmit(values);
      setValues(EMPTY);
      setTouched(new Set());
      setErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card glass p-6 lg:p-7 flex flex-col gap-5"
      noValidate
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Create cloaked URL</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Route bots and humans to different destinations from one link.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
          <Sparkles className="h-3.5 w-3.5 text-brand-400" />
          New link
        </span>
      </header>

      <div className="flex flex-col gap-4">
        <Field
          label="Bot URL"
          hint="Where Google bots & crawlers will land."
          icon={<Bot className="h-4 w-4" />}
          error={showError("botUrl")}
        >
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://safe-page.example.com"
            value={values.botUrl}
            onChange={(e) => update("botUrl", e.target.value)}
            onBlur={() => markTouched("botUrl")}
            className="input"
            aria-invalid={Boolean(showError("botUrl"))}
          />
        </Field>

        <Field
          label="User URL"
          hint="Where real visitors will be redirected."
          icon={<User className="h-4 w-4" />}
          error={showError("userUrl")}
        >
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://offer.example.com/landing"
            value={values.userUrl}
            onChange={(e) => update("userUrl", e.target.value)}
            onBlur={() => markTouched("userUrl")}
            className="input"
            aria-invalid={Boolean(showError("userUrl"))}
          />
        </Field>

        <Field
          label="Custom slug"
          hint="Optional. Leave empty to auto-generate."
          icon={<Hash className="h-4 w-4" />}
          error={showError("slug")}
        >
          <div className="flex gap-2">
            <input
              type="text"
              autoComplete="off"
              placeholder="summer-sale"
              value={values.slug}
              onChange={(e) => update("slug", sanitizeSlug(e.target.value))}
              onBlur={() => markTouched("slug")}
              className="input"
              aria-invalid={Boolean(showError("slug"))}
            />
            <button
              type="button"
              onClick={handleRandomize}
              className="btn-ghost shrink-0"
              title="Generate a random slug"
            >
              <Shuffle className="h-4 w-4" />
              <span className="hidden sm:inline">Random</span>
            </button>
          </div>
        </Field>

        <Field
          label="Campaign name"
          hint="Optional label to organize your links."
          icon={<Megaphone className="h-4 w-4" />}
          error={showError("campaignName")}
        >
          <input
            type="text"
            autoComplete="off"
            placeholder="Q4 Black Friday"
            value={values.campaignName}
            onChange={(e) => update("campaignName", e.target.value)}
            onBlur={() => markTouched("campaignName")}
            maxLength={80}
            className="input"
            aria-invalid={Boolean(showError("campaignName"))}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full mt-1"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate cloaked link
          </>
        )}
      </button>
    </form>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, hint, icon, error, children }: FieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label flex items-center gap-1.5">
          {icon ? <span className="text-brand-400">{icon}</span> : null}
          {label}
        </label>
      </div>
      {children}
      <div className="mt-1.5 min-h-[1rem] text-xs">
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : hint ? (
          <span className="text-gray-500">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
