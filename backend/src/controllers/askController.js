import { askEmailQuestion } from "../services/askEmailService.js";

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