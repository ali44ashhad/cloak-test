const BOT_USER_AGENT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|googlebot|adsbot|google-inspectiontool|chrome-lighthouse|duckduckbot|yandex|baiduspider|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|whatsapp|telegram|twitterbot|linkedinbot|slackbot|discordbot|embedly|prerender|headless|http-?client|axios|fetch|wget|curl|python-requests|node-fetch|phantomjs|puppeteer|playwright|scrapy|java\/|okhttp|go-http-client/i;

export type BotReason =
  | "empty-ua"
  | "ua-pattern"
  | "preview-override"
  | "human";

export interface DetectionResult {
  isBot: boolean;
  reason: BotReason;
}

export function detectBot(
  userAgent: string | undefined,
  previewParam: string | null | undefined
): DetectionResult {
  if (previewParam === "bot") {
    return { isBot: true, reason: "preview-override" };
  }
  if (previewParam === "user") {
    return { isBot: false, reason: "preview-override" };
  }
  if (!userAgent || userAgent.trim().length === 0) {
    return { isBot: true, reason: "empty-ua" };
  }
  if (BOT_USER_AGENT_PATTERN.test(userAgent)) {
    return { isBot: true, reason: "ua-pattern" };
  }
  return { isBot: false, reason: "human" };
}
