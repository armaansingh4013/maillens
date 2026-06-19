import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import prisma from "./db/prisma.js";
import authRoutes from "./routes/authRoutes.js";
import gmailRoutes from "./routes/gmailRoutes.js";
import digestRoutes from "./routes/digestRoutes.js";
import { startDigestJob } from "./jobs/digestJob.js";
import { startEmailSyncJob } from "./jobs/syncEmailsJob.js";
import { startSummarizeJob } from "./jobs/summarizeEmailsJob.js";
import { startBackfillSupervisorJob } from "./jobs/backfillSupervisorJob.js";
import { startSummarizeSupervisorJob } from "./jobs/summarizeSupervisorJob.js";
import askRoutes from "./routes/askRoutes.js";


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
  app.use("/gmail", gmailRoutes);
  app.use("/digest", digestRoutes);
  app.use("/ask", askRoutes);
startDigestJob();
startEmailSyncJob();
startSummarizeJob();
startBackfillSupervisorJob();
startSummarizeSupervisorJob();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});