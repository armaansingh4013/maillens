import express from "express";
import { processEmails } from "../controllers/emailController";

const router = express.Router();

router.post("/", processEmails);

export default router;