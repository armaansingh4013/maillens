import prisma from "../db/prisma.js";
import { buildAndSaveTodayDigest } from "../services/digestBuilderService.js";
import { sendDigestEmail } from "../services/digestMailer.js";

export const getTodayDigest = async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId is required" });
    }

    const { digest, stats } = await buildAndSaveTodayDigest(userId);

    return res.json({
      ok: true,
      digest,
      stats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
};

// Manual trigger — builds today's digest (if not already built) and
// emails it right now, instead of waiting for the 7pm cron job.
export const sendTodayDigest = async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    const { digest, stats } = await buildAndSaveTodayDigest(userId);
    const mail = await sendDigestEmail({ user, digestContent: digest.content, stats });

    return res.json({ ok: true, digest, stats, mail });
  } catch (error) {
    console.error("Send digest error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
};
