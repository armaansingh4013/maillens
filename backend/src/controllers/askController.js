import { askEmailQuestion } from "../services/askEmailService.js";
import prisma from "../db/prisma.js";

export const askEmail = async (req, res) => {
  try {
    const { userId, question } = req.body;

    if (!userId || !question) {
      return res.status(400).json({
        ok: false,
        error: "userId and question are required",
      });
    }

    const result = await askEmailQuestion({ userId, question });

    return res.json({
      ok: true,
      answer: result.answer,
      matches: result.matches,
    });
  } catch (error) {
    console.error("Ask email error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
};


export const askConversation = async (req, res) => {

  try {

    const { conversationId } = req.params;

    const { userId, message } = req.body;

    if (!userId) {

      return res.status(400).json({

        success: false,

        message: "userId is required",

      });

    }

    if (!message?.trim()) {

      return res.status(400).json({

        success: false,

        message: "message is required",

      });

    }

    // --------------------------------

    // 1. Get conversation

    // --------------------------------

    const conversation = await prisma.conversation.findFirst({

      where: {

        id: conversationId,

        userId,

      },

    });

    if (!conversation) {

      return res.status(404).json({

        success: false,

        message: "Conversation not found",

      });

    }

    // --------------------------------

    // 2. Save user's message

    // --------------------------------

    const userMessage = await prisma.chatMessage.create({

      data: {

        conversationId,

        role: "user",

        content: message.trim(),

      },

    });

    // --------------------------------

    // 3. Get conversation history

    // --------------------------------

    const history = await prisma.chatMessage.findMany({

      where: {

        conversationId,

      },

      orderBy: {

        createdAt: "asc",

      },

      select: {

        role: true,

        content: true,

      },

    });

    // --------------------------------

    // 4. Get user memories

    // --------------------------------

    const memories = await prisma.userMemory.findMany({

      where: {

        userId,

      },

      orderBy: {

        updatedAt: "desc",

      },

      select: {

        content: true,

        type: true,

      },

    });

    // --------------------------------

    // 5. YOUR RAG / OLLAMA LOGIC

    // --------------------------------

    /*

      Here you do:

      1. Search emails

      2. Retrieve relevant chunks

      3. Build context

      4. Send history + memories + email context

         to Ollama

    */

    const result = await askEmailQuestion({ userId, question: message.trim() });
    const assistantResponse = result.answer || "I couldn't find an answer in your inbox.";

    // --------------------------------

    // 6. Save assistant response

    // --------------------------------

    const assistantMessage = await prisma.chatMessage.create({

      data: {

        conversationId,

        role: "assistant",

        content: assistantResponse,

      },

    });

    // --------------------------------

    // 7. Update conversation

    // --------------------------------

    await prisma.conversation.update({

      where: {

        id: conversationId,

      },

      data: {

        updatedAt: new Date(),

      },

    });

    // --------------------------------

    // 8. Return response

    // --------------------------------

    return res.status(200).json({

      success: true,

      userMessage,

      assistantMessage,

      conversationId,

    });

  } catch (error) {

    console.error("Ask email error:", error);

    return res.status(500).json({

      success: false,

      message: "Failed to process question",

    });

  }

};
