export interface CloakedLink {
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

export interface DashboardStats {
  total: number;
  active: number;
  todayClicks: number;
  uniqueVisitors: number;
}

export interface LinkDoc {
  _id: string;
  campaignName: string;
  botUrl: string;
  userUrl: string;
  slug: string;
  active: boolean;
  createdAt: Date;
  clicks: number;
  uniqueVisitors: number;
  lastClickAt: Date | null;
}

export interface VisitorDoc {
  linkId: string;
  visitorHash: string;
  firstSeenAt: Date;
}

export interface DailyClickDoc {
  _id: string;
  count: number;
}
