import axios from "axios";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export const embedText = async (text) => {
  const response = await axios.post(`${OLLAMA_URL}/api/embed`, {
    model: "nomic-embed-text",
    input: text,
  });

  const embeddings = response.data.embeddings || [];

  if (!embeddings.length) {
    throw new Error("No embedding returned from Ollama");
  }

  return embeddings[0];
};