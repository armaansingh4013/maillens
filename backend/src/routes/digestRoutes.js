import express from "express";
import { getTodayDigest } from "../controllers/digestController.js";

const router = express.Router();

router.get("/today", getTodayDigest);

export default router;
