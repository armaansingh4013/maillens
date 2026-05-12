import { processUnprocessedEmails } from "../services/processEmailService";


export async function processEmails(req, res) {

    try {
  
      const { userId } = req.params;
  
      await processUnprocessedEmails(userId);
  
      res.json({
  
        success: true,
  
        message: "Emails processed successfully",
  
      });
  
    } catch (error) {
  
      res.status(500).json({
  
        success: false,
  
        message: "Failed to process emails",
  
        error,
  
      });
  
    }
  
  }