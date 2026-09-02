import express from "express";
import { getInsightsSummary } from "../controllers/insightsController.js";

const router = express.Router();

router.get("/summary", getInsightsSummary);

export default router;
