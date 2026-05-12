export const buildDailyDigest = (summaries) => {
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
  
    return `Received ${useful.length} useful emails.
  
  Emails are about:
  ${uniqueTopics.length ? uniqueTopics.map((t) => `- ${t}`).join("\n") : "- None"}
  
  Action required:
  ${
    uniqueActions.length
      ? uniqueActions.map((a, i) => `${i + 1}. ${a}`).join("\n")
      : "- None"
  }`;
  };