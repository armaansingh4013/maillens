export const filterEmail = (email) => {
    const subject = (email.subject || "").toLowerCase();
    const body = (email.bodyText || "").toLowerCase();
    const from = (email.fromEmail || "").toLowerCase();
  
    // OTP detection
    if (
      subject.includes("otp") ||
      subject.includes("verification code") ||
      body.includes("otp") ||
      body.includes("verification code")
    ) {
      return {
        ignore: true,
        reason: "otp",
      };
    }
  
    // Promotions / marketing
    if (
      subject.includes("sale") ||
      subject.includes("offer") ||
      subject.includes("discount") ||
      subject.includes("deal") ||
      subject.includes("limited time")
    ) {
      return {
        ignore: true,
        reason: "promotion",
      };
    }
  
    // Newsletters
    if (
      subject.includes("newsletter") ||
      subject.includes("weekly update") ||
      subject.includes("daily update")
    ) {
      return {
        ignore: true,
        reason: "newsletter",
      };
    }
  
    // Social / notifications
    if (
      from.includes("noreply") ||
      from.includes("no-reply") ||
      subject.includes("notification")
    ) {
      return {
        ignore: true,
        reason: "notification",
      };
    }
  
    return {
      ignore: false,
      reason: null,
    };
  };