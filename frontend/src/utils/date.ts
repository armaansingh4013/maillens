export function formatDate(value?: string) {
    if (!value) return "Unknown date";
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return value;
    }
  
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }