import asyncHandler from "express-async-handler";
import PdfVector from "../models/pdfVector.models.js";
import Pdf from "../models/pdf.models.js";
import Chat from "../models/chat.models.js";
import cloudinary from "../utils/cloudinary.js";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { ChatOpenAI } from "@langchain/openai";
import mongoose from "mongoose";
import { runChatAgent } from "../services/ChatAgent.js";


export const createChat = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { chatId, title } = req.body;
    if (!chatId) {
        return res.status(400).json({ message: "ChatId is required" });
    }
    const chat = await Chat.findOneAndUpdate(
        { _id: chatId, userId },
        {
            $setOnInsert: {
                _id: chatId,
                userId,
                title: title || "New Chat",
                messages: [],
                pdfIds: []
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json(chat);
});

export const getChats = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });

    res.status(200).json(chats);
});

export const updateChat = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { chatId } = req.body;
    if (!chatId) {
        return res.status(400).json({ message: "ChatId is required" });
    }
    const chat = await Chat.findOneAndUpdate({ _id: chatId, userId }, req.body, { new: true });
    res.status(200).json(chat);
});

export const chatRename = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { chatId, title } = req.body;
    if (!chatId) {
        return res.status(400).json({ message: "ChatId is required" });
    }
    const chat = await Chat.findOneAndUpdate({ _id: chatId, userId }, { title }, { new: true });
    res.status(200).json(chat);
});

export const deleteChat = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { chatId } = req.body;
    if (!chatId) {
        return res.status(400).json({ message: "ChatId is required" });
    }

    // Find all PDFs for this chat to get their public_ids
    const pdfs = await Pdf.find({ chatId, userId });

    // Delete files from Cloudinary
    for (const pdf of pdfs) {
        if (pdf.pdf_public_id) {
            await cloudinary.uploader.destroy(pdf.pdf_public_id).catch(err =>
                console.error(`Error deleting PDF ${pdf._id} from Cloudinary:`, err)
            );
        }
    }

    const chat = await Chat.findOneAndDelete({ _id: chatId, userId });
    await Pdf.deleteMany({ chatId, userId });
    await PdfVector.deleteMany({ "metadata.chatId": chatId, "metadata.userId": userId });

    res.status(200).json(chat);
});

export const chatWithPdf = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const { question, chatId } = req.body;

    if (!question || !chatId) {
        return res.status(400).json({ message: "Question and chatId are required" });
    }

    const embeddings = new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
    });

    // Generate question embedding
    const questionEmbedding = await embeddings.embedQuery(question);

    // Similarity search in MongoDB
    // Note: This requires a Vector Search index named "vector_index" in MongoDB Atlas
    const results = await PdfVector.aggregate([
        {
            $search: {
                index: "vector_index",
                knnBeta: {
                    vector: questionEmbedding,
                    path: "embedding",
                    k: 4,
                },
            },
        },
        {
            $match: {
                "metadata.userId": new mongoose.Types.ObjectId(userId),
                "metadata.chatId": chatId,
            },
        },
    ]);

    const context = results.map((doc) => doc.pageContent).join("\n\n");

    const citations = results.map((doc) => ({
        id: doc._id.toString(),
        documentName: doc.metadata?.originalName || doc.metadata?.pdfId || "Document",
        pageNumber: doc.metadata?.pageNumber || 1,
        sectionTitle: "Context from PDF",
    }));

    //     const llm = new ChatOpenAI({
    //         model: "llama-3.3-70b-versatile",
    //         temperature: 0,
    //         apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
    //         configuration: {
    //             baseURL: "https://api.groq.com/openai/v1",
    //         },
    //     });

    //     const prompt = `
    //     Use the following context to answer the question. If you don't know the answer, just say that you don't know.

    //     Context:
    //     ${context}

    //     Question:
    //     ${question}

    //     Answer:
    //   `;

    //     const result = await llm.invoke(prompt);

    const result = await runChatAgent({ question, context });

    // Persist messages to Chat history
    await Chat.findOneAndUpdate(
        { _id: chatId, userId },
        {
            $push: {
                messages: {
                    $each: [
                        { role: "user", content: question },
                        { role: "assistant", content: result, citations }
                    ]
                }
            }
        }
    );

    res.status(200).json({
        success: true,
        answer: result,
        citations: citations,
    });
});


export const getpdfs = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { chatId } = req.params;
    const pdfs = await Pdf.find({
        userId,
        chatId
    }).sort({ createdAt: -1 });
    res.status(200).json(pdfs);
});

export const getAllUserPdfs = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const pdfs = await Pdf.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(pdfs);
});