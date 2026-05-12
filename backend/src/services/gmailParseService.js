export function getHeader(headers, name) {
    return (
      headers?.find(
        (header) => header.name.toLowerCase() === name.toLowerCase()
      )?.value || null
    );
  }
  
  export function decodeBase64Url(data) {
    if (!data) return null;
  
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  }
  
  export function extractBody(payload) {
    if (!payload) return null;
  
    if (payload.body?.data) {
      return decodeBase64Url(payload.body.data);
    }
  
    if (payload.parts?.length) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return decodeBase64Url(part.body.data);
        }
      }
  
      for (const part of payload.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  
    return null;
  }
  
  export function extractEmailAddress(fromValue) {
    if (!fromValue) return null;
  
    const match = fromValue.match(/<([^>]+)>/);
    return match ? match[1] : fromValue.trim();
  }
  
  export function extractDomain(fromValue) {
    const email = extractEmailAddress(fromValue);
    if (!email || !email.includes("@")) return null;
    return email.split("@")[1].toLowerCase();
  }