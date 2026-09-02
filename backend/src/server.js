import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import prisma from "./db/prisma.js";
import authRoutes from "./routes/authRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import gmailRoutes from "./routes/gmailRoutes.js";
import digestRoutes from "./routes/digestRoutes.js";
import { startDigestJob } from "./jobs/digestJob.js";
import { startEmailSyncJob } from "./jobs/syncEmailsJob.js";
import { startSummarizeJob } from "./jobs/summarizeEmailsJob.js";
import { startBackfillSupervisorJob } from "./jobs/backfillSupervisorJob.js";
import { startSummarizeSupervisorJob } from "./jobs/summarizeSupervisorJob.js";
import askRoutes from "./routes/askRoutes.js";
import insightsRoutes from "./routes/insightsRoutes.js";


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(
    session({
      secret: process.env.SESSION_SECRET || "maillens_secret",
      resave: false,
      saveUninitialized: false,
    })
  );

app.get("/", (req, res) => {
  res.json({ message: "MailLens backend is running" });
});

app.get("/test-db", async (req, res) => {
    try {
      const count = await prisma.user.count();
      res.json({ ok: true, userCount: count });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.use("/auth", authRoutes);
  app.use("/emails", emailRoutes);
  app.use("/gmail", gmailRoutes);
  app.use("/digest", digestRoutes);
  app.use("/ask", askRoutes);
  app.use("/insights", insightsRoutes);
// Get emails from Gmail and store them in the database every 10 minutes
startEmailSyncJob();

// Fill in full mailbox history for newly-connected users, 5 pages at a
// time, every 15 minutes, until initialBackfillCompleted is true.
startBackfillSupervisorJob();

// Summarize + extract facts/payments/tasks/etc from new emails, then
// embed them for the Ask feature — runs every minute.
startSummarizeJob();

// Build + email the evening digest ("X received, Y ads") at 7pm daily.
startDigestJob();

// NOTE: startSummarizeSupervisorJob() is an alternate, persistent-worker
// implementation of the same summarize step above (via WorkerState +
// runSummarizeWorker's own while-loop). Running it alongside
// startSummarizeJob() would let two consumers pull the same
// isSummarized:false rows at once and double-insert Payment/Task/etc
// rows, since those tables aren't upserted. Left disabled on purpose —
// pick one summarizer path if you revisit this.
// startSummarizeSupervisorJob();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
