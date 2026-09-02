const AD_REASONS = ["promotion", "newsletter"];

/**
 * Pure function — takes a plain list of email rows (with isIgnored /
 * ignoreReason flags already set by the filter/summarizer) and produces
 * the day's headline numbers. No DB access here so it can be unit tested
 * with fake data.
 */
export function buildDailyStats(emails = []) {
  const received = emails.length;
  const ads = emails.filter((e) => AD_REASONS.includes(e.ignoreReason)).length;
  const ignored = emails.filter((e) => e.isIgnored).length;
  const important = Math.max(received - ignored, 0);

  return { received, ads, ignored, important };
}

export { AD_REASONS };
