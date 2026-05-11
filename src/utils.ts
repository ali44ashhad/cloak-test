import type { CloakedUrlFormErrors, CloakedUrlInput } from "./types";

const SLUG_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function generateSlug(length = 7): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

export function sanitizeSlug(value: string): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\s+/g, "-");
}

export function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateInput(
  input: CloakedUrlInput,
  existingSlugs: Set<string>
): CloakedUrlFormErrors {
  const errors: CloakedUrlFormErrors = {};

  if (!input.botUrl.trim()) {
    errors.botUrl = "Bot URL is required.";
  } else if (!isValidUrl(input.botUrl.trim())) {
    errors.botUrl = "Enter a valid http(s) URL.";
  }

  if (!input.userUrl.trim()) {
    errors.userUrl = "User URL is required.";
  } else if (!isValidUrl(input.userUrl.trim())) {
    errors.userUrl = "Enter a valid http(s) URL.";
  }

  const slug = sanitizeSlug(input.slug);
  if (slug) {
    if (!SLUG_PATTERN.test(slug)) {
      errors.slug =
        "Slug can only contain letters, numbers, dot, dash, underscore.";
    } else if (slug.length > 48) {
      errors.slug = "Slug must be 48 characters or fewer.";
    } else if (existingSlugs.has(slug.toLowerCase())) {
      errors.slug = "Slug is already in use.";
    }
  }

  if (input.campaignName.trim().length > 60) {
    errors.campaignName = "Campaign name must be 60 characters or fewer.";
  }

  return errors;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function copyToClipboard(text: string): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (ok) resolve();
      else reject(new Error("Copy command was unsuccessful."));
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Unknown copy error."));
    }
  });
}
