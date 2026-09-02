import express from "express";
import {
  getDbEmails,
  processEmails,
} from "../controllers/emailController.js";

const router = express.Router();

router.get("/db", getDbEmails);
router.post("/", processEmails);
router.post("/process", processEmails);

export default router;
