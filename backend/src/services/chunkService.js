// export const chunkEmailContent = (email) => {
//     const parts = [
//       email.subject ? `Subject: ${email.subject}` : "",
//       email.fromEmail ? `From: ${email.fromEmail}` : "",
//       email.snippet ? `Snippet: ${email.snippet}` : "",
//       email.bodyText ? `Body:\n${email.bodyText}` : "",
//     ].filter(Boolean);
  
//     const fullText = parts.join("\n\n").trim();
  
//     if (!fullText) return [];
  
//     const chunkSize = 700;
//     const overlap = 100;
//     const chunks = [];
  
//     let start = 0;
//     let index = 0;
  
//     while (start < fullText.length) {
//       const end = Math.min(start + chunkSize, fullText.length);
//       const content = fullText.slice(start, end).trim();
  
//       if (content) {
//         chunks.push({
//           chunkIndex: index,
//           content,
//         });
//         index += 1;
//       }
  
//       if (end === fullText.length) break;
//       start = end - overlap;
//     }
  
//     return chunks;
//   };


const MAX_CHARS = 1000;

export const chunkEmailContent = (email) => {
  const body = email.bodyText?.trim();

  if (!body) return [];

  // Clean body
  const cleanBody = body
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleanBody) return [];

  // If entire body fits in one chunk
  if (cleanBody.length <= MAX_CHARS) {
    return [
      {
        chunkIndex: 0,
        content: cleanBody,
      },
    ];
  }

  // Split body into paragraphs
  const paragraphs = cleanBody
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks = [];
  let currentChunk = "";

  const addChunk = () => {
    if (!currentChunk) return;

    chunks.push({
      chunkIndex: chunks.length,
      content: currentChunk.trim(),
    });

    currentChunk = "";
  };

  for (const paragraph of paragraphs) {
    // If paragraph itself is larger than MAX_CHARS
    if (paragraph.length > MAX_CHARS) {
      // Add anything accumulated before this paragraph
      addChunk();

      // Split large paragraph
      for (let i = 0; i < paragraph.length; i += MAX_CHARS) {
        chunks.push({
          chunkIndex: chunks.length,
          content: paragraph.slice(i, i + MAX_CHARS).trim(),
        });
      }

      continue;
    }

    // Check if paragraph can fit in current chunk
    const separator = currentChunk ? "\n\n" : "";
    const combinedLength =
      currentChunk.length + separator.length + paragraph.length;

    if (combinedLength <= MAX_CHARS) {
      currentChunk += separator + paragraph;
    } else {
      // Current chunk is full
      addChunk();

      // Start new chunk with this paragraph
      currentChunk = paragraph;
    }
  }

  // Add remaining content
  addChunk();

  return chunks;
};