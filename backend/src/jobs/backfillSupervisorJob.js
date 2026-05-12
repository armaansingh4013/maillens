import cron from "node-cron";
import prisma from "../db/prisma.js";
import { runInitialBackfillForUser } from "./initialBackfillJob.js";

export const startBackfillSupervisorJob = () => {
  cron.schedule("*/15 * * * *", async () => {
    console.log("Running backfill supervisor job...");

    try {
      const users = await prisma.user.findMany({
        where: {
          syncState: {
            is: {
              initialBackfillCompleted: false,
            },
          },
        },
        include: {
          syncState: true,
        },
      });

      for (const user of users) {
        try {
          const result = await runInitialBackfillForUser(user.id);
          console.log(`Backfill for ${user.email}:`, result);
        } catch (error) {
          console.error(`Backfill failed for ${user.email}:`, error.message);
        }
      }
    } catch (error) {
      console.error("Backfill supervisor failed:", error.message);
    }
  });
};