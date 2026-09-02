import express from "express";
import { askConversation, askEmail } from "../controllers/askController.js";
import { createConversation, deleteConversation, getConversation, getConversationMessages, getConversations } from "../controllers/conversationController.js";

const router = express.Router();

router.post("/", askEmail);

// Create a new conversation

router.post("/new", createConversation);

// Get all conversations for the user

router.get("/", getConversations);

// Get one conversation

router.get("/:conversationId", getConversation);

// Get messages in a conversation

router.get("/:conversationId/messages", getConversationMessages);

// Ask AI inside a conversation

router.post("/:conversationId/ask", askConversation);

// Delete conversation

router.delete("/:conversationId", deleteConversation);

export default router;