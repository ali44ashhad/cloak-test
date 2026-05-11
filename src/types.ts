export interface CloakedUrl {
  id: string;
  campaignName: string;
  botUrl: string;
  userUrl: string;
  slug: string;
  cloakedUrl: string;
  active: boolean;
  createdAt: string;
  clicks: number;
  uniqueVisitors: number;
  lastClickAt: string | null;
}

export interface CloakedUrlInput {
  botUrl: string;
  userUrl: string;
  slug: string;
  campaignName: string;
}

export type CloakedUrlFormErrors = Partial<
  Record<keyof CloakedUrlInput, string>
>;

export interface DashboardStats {
  total: number;
  active: number;
  todayClicks: number;
  uniqueVisitors: number;
}

export type ConfirmAction =
  | { kind: "delete"; id: string; campaignName: string }
  | null;
