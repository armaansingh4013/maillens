import express from "express";
import {
  embedNow,
  getEmails,
  summarizeNow,
  syncNow,
  testSummarize,
  sendEmailNow,
  replyEmailNow,
  forwardEmailNow,
  archiveEmailNow,
  trashEmailNow,
} from "../controllers/gmailController.js";

const router = express.Router();

router.get("/summarize-test", testSummarize);
router.get("/emails", getEmails);
router.get("/sync-now", syncNow);
router.get("/summarize-now", summarizeNow);
router.get("/embed-now", embedNow);

router.post("/send", sendEmailNow);
router.post("/reply", replyEmailNow);
router.post("/forward", forwardEmailNow);
router.post("/archive", archiveEmailNow);
router.post("/trash", trashEmailNow);

export default router;
