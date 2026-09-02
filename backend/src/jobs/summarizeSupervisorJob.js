import cron from "node-cron";
import prisma from "../db/prisma.js";
import { runSummarizeWorker } from "./summarizeWorkerJob.js";

const WORKER_NAME = "email_summarizer";

export const startSummarizeSupervisorJob = () => {
  cron.schedule("*/1 * * * *", async () => {
    console.log("Running summarize supervisor...");

    try {
      const pendingCount = await prisma.email.count({
        where: {
          isSummarized: false,
        },
      });

      if (pendingCount === 0) {
        console.log("No pending emails to summarize");
        return;
      }

      let worker = await prisma.workerState.findUnique({
        where: {
          workerName: WORKER_NAME,
        },
      });

      if (!worker) {
        worker = await prisma.workerState.create({
          data: {
            workerName: WORKER_NAME,
            isRunning: false,
          },
        });
      }

      const now = new Date();
      const staleMinutes = 10;
      const isStale =
        worker.isRunning &&
        worker.lastHeartbeatAt &&
        now.getTime() - new Date(worker.lastHeartbeatAt).getTime() >
          staleMinutes * 60 * 1000;

      if (worker.isRunning && !isStale) {
        console.log("Summarizer already running");
        return;
      }

      await prisma.workerState.update({
        where: {
          workerName: WORKER_NAME,
        },
        data: {
          isRunning: true,
          startedAt: now,
          lastHeartbeatAt: now,
        },
      });

      runSummarizeWorker(WORKER_NAME).catch((err) => {
        console.error("Summarize worker crashed:", err.message);
      });
    } catch (error) {
      console.error("Summarize supervisor failed:", error.message);
    }
  });
};