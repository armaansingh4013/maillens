import express from "express";
import { askEmail } from "../controllers/askController.js";

const router = express.Router();

router.post("/", askEmail);

export default router;