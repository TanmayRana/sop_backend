import Pdf from "../models/pdf.models.js";
import Chat from "../models/chat.models.js";

export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Total Documents
        const totalDocuments = await Pdf.countDocuments({ userId });

        // 2. Questions Answered (Total messages from all chats of this user)
        const chats = await Chat.find({ userId });
        const totalMessages = chats.reduce((acc, chat) => {
            // Count only user messages or assistant messages if preferred
            return acc + (chat.messages ? chat.messages.length : 0);
        }, 0);

        // 3. Recent Documents (Top 5)
        const recentDocuments = await Pdf.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("pdfName createdAt pdfUrl");

        // Format recent documents for frontend
        const formattedRecentDocs = recentDocuments.map(doc => ({
            name: doc.pdfName,
            status: "ready", // For now, assume ready as they are in DB
            uploadedAt: doc.createdAt
        }));

        res.status(200).json({
            success: true,
            stats: {
                totalDocuments: totalDocuments.toString(),
                questionsAnswered: totalMessages.toString(),
                avgResponseTime: "1.2s", // Placeholder
                accuracyRate: "98.5%" // Placeholder
            },
            recentDocuments: formattedRecentDocs
        });
    } catch (error) {
        console.error("Error in getDashboardStats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard stats"
        });
    }
};
