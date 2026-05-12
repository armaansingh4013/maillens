import express from "express";
import { embedNow, getEmails, summarizeNow, syncNow } from "../controllers/gmailController.js";
import { testSummarize } from "../controllers/gmailController.js";

const router = express.Router();

router.get("/summarize-test", testSummarize);
router.get("/emails", getEmails);
router.get("/sync-now", syncNow);
router.get("/summarize-now", summarizeNow);
router.get("/embed-now", embedNow);

export default router;