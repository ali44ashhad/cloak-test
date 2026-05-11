import type { CloakedUrl, CloakedUrlInput, DashboardStats } from "./types";

const API_BASE = "/api";

export interface ApiErrorDetails {
  [field: string]: string[] | undefined;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: ApiErrorDetails;

  constructor(message: string, status: number, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface ErrorBody {
  error?: string;
  details?: ApiErrorDetails;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error
        ? `Network error: ${err.message}`
        : "Network error reaching the server.",
      0
    );
  }

  if (!response.ok) {
    let body: ErrorBody | null = null;
    try {
      body = (await response.json()) as ErrorBody;
    } catch {
      /* response body was not JSON */
    }
    throw new ApiError(
      body?.error ?? `Request failed (${response.status}).`,
      response.status,
      body?.details
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export interface UpdateLinkPatch {
  active?: boolean;
  campaignName?: string;
  botUrl?: string;
  userUrl?: string;
}

export const api = {
  listLinks: (): Promise<{ links: CloakedUrl[] }> => request("/links"),
  createLink: (input: CloakedUrlInput): Promise<{ link: CloakedUrl }> =>
    request("/links", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateLink: (
    id: string,
    patch: UpdateLinkPatch
  ): Promise<{ link: CloakedUrl }> =>
    request(`/links/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteLink: (id: string): Promise<void> =>
    request(`/links/${encodeURIComponent(id)}`, { method: "DELETE" }),
  getStats: (): Promise<DashboardStats> => request("/stats"),
};
