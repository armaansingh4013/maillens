import prisma from "../db/prisma.js";
import { buildDailyDigest } from "../services/digestService.js";

export const getTodayDigest = async (req, res) => {
    try {
      const userId = req.query.userId;
  
      const start = new Date();
      start.setHours(0, 0, 0, 0);
  
      const summaries = await prisma.emailSummary.findMany({
        where: {
          email: {
            userId,
            internalDate: {
              gte: start,
            },
          },
        },
        include: {
          email: true,
        },
      });
      const digest = buildDailyDigest(summaries);
      const saved = await prisma.dailyDigest.upsert({
        where: {
          userId_digestDate: {
            userId,
            digestDate: start,
          },
        },
        update: {
          content: digest,
        },
        create: {
          userId,
          digestDate: start,
          content: digest,
        },
      });
  
      return res.json({
        ok: true,
        digest: saved,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, error: error.message });
    }
  };