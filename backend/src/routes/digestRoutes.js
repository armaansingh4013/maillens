import express from "express";
import { getTodayDigest, sendTodayDigest } from "../controllers/digestController.js";

const router = express.Router();

router.get("/today", getTodayDigest);
router.get("/send-now", sendTodayDigest);

export default router;
