export const chunkEmailContent = (email) => {
    const parts = [
      email.subject ? `Subject: ${email.subject}` : "",
      email.fromEmail ? `From: ${email.fromEmail}` : "",
      email.snippet ? `Snippet: ${email.snippet}` : "",
      email.bodyText ? `Body:\n${email.bodyText}` : "",
    ].filter(Boolean);
  
    const fullText = parts.join("\n\n").trim();
  
    if (!fullText) return [];
  
    const chunkSize = 700;
    const overlap = 100;
    const chunks = [];
  
    let start = 0;
    let index = 0;
  
    while (start < fullText.length) {
      const end = Math.min(start + chunkSize, fullText.length);
      const content = fullText.slice(start, end).trim();
  
      if (content) {
        chunks.push({
          chunkIndex: index,
          content,
        });
        index += 1;
      }
  
      if (end === fullText.length) break;
      start = end - overlap;
    }
  
    return chunks;
  };