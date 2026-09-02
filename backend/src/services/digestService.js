/**
 * @param {Array} summaries - EmailSummary rows (with `email` relation included)
 * @param {{received:number, ads:number, ignored:number, important:number}} [stats]
 *   Headline counts for the day, e.g. from dailyStatsService.buildDailyStats.
 *   Optional so existing callers that don't pass it keep working.
 */
export const buildDailyDigest = (summaries, stats) => {
    const useful = summaries.filter(
      (s) => s.includeInDigest && !s.email?.isIgnored
    );

    const topics = [];
    const actions = [];

    for (const s of useful) {
      if (s.topic) {
        topics.push(s.topic);
      } else if (s.shortSummary) {
        topics.push(s.shortSummary);
      }

      if (s.actionRequired && s.actionItem) {
        actions.push(s.actionItem);
      }
    }

    const uniqueTopics = [...new Set(topics)];
    const uniqueActions = [...new Set(actions)];

    const statsLine = stats
      ? `Received ${stats.received} email${stats.received === 1 ? "" : "s"} today — ${stats.ads} ad${stats.ads === 1 ? "" : "s"}/promotions, ${stats.important} important.\n\n`
      : "";

    return `${statsLine}Received ${useful.length} useful emails.

  Emails are about:
  ${uniqueTopics.length ? uniqueTopics.map((t) => `- ${t}`).join("\n") : "- None"}

  Action required:
  ${
    uniqueActions.length
      ? uniqueActions.map((a, i) => `${i + 1}. ${a}`).join("\n")
      : "- None"
  }`;
  };