import { inngest } from './client.js';
import PdfVector from "../models/pdfVector.models.js";
import Pdf from "../models/pdf.models.js";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import connectDB from "../config/database.js";
import fs from "fs";
import path from "path";
import os from "os";
import { finished } from "stream/promises";
import { Readable } from "stream";
import Studio from "../models/studio.models.js";
import { runStudioAgent } from "../services/StudioAgent.js";
import mongoose from "mongoose";

export const helloWorld = inngest.createFunction(
  { id: 'hello-world' },
  { event: 'test/hello.world' },
  async ({ event }) => {
    return { message: `Hello ${event.data.email}!` };
  }
);

export const processPdf = inngest.createFunction(
  { id: "process-pdf" },
  { event: "pdf/process" },
  async ({ event }) => {
    // Ensure DB connection in background worker
    await connectDB();

    const { userId, chatId, pdfId, pdfUrl, originalName } = event.data;
    let tempFilePath = null;

    console.log(`Starting processing for PDF: ${originalName} (ID: ${pdfId})`);

    try {
      // Download file to a temporary location
      tempFilePath = path.join(os.tmpdir(), `${pdfId}.pdf`);
      console.log(`Downloading PDF from: ${pdfUrl}`);
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);

      const fileStream = fs.createWriteStream(tempFilePath);
      await finished(Readable.fromWeb(response.body).pipe(fileStream));
      console.log(`Downloaded to: ${tempFilePath}`);

      const loader = new PDFLoader(tempFilePath);
      const docs = await loader.load();
      console.log(`Loaded ${docs.length} pages from PDF`);

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await splitter.splitDocuments(docs);
      console.log(`Split into ${splitDocs.length} chunks`);

      const embeddings = new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
      });

      const vectorDocs = [];

      for (let i = 0; i < splitDocs.length; i++) {
        const doc = splitDocs[i];
        const vector = await embeddings.embedQuery(doc.pageContent);

        vectorDocs.push({
          pageContent: doc.pageContent,
          embedding: vector,
          metadata: {
            userId,
            chatId,
            pdfId,
            pageNumber: doc.metadata?.loc?.pageNumber || 1,
            originalName
          },
        });

        if ((i + 1) % 10 === 0) {
          console.log(`Generated embeddings for ${i + 1}/${splitDocs.length} chunks`);
        }
      }

      // Bulk insert vectors for efficiency
      if (vectorDocs.length > 0) {
        console.log(`Inserting ${vectorDocs.length} vectors into MongoDB...`);
        const insertedVectors = await PdfVector.insertMany(vectorDocs);
        console.log(`Successfully inserted vectors.`);

        // Link vectors back to the Pdf document
        const vectorIds = insertedVectors.map(v => v._id);
        await Pdf.findByIdAndUpdate(pdfId, {
          $push: { pdfVectors: { $each: vectorIds } }
        });
        console.log(`Linked ${vectorIds.length} vectors to Pdf document.`);
      }

      console.log(`Processing complete for: ${originalName}`);
      return {
        success: true,
        chunks: vectorDocs.length,
        pdfId
      };
    } catch (error) {
      console.error("Error processing PDF in Inngest:", error);
      throw error;
    } finally {
      // Cleanup temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log(`Cleaned up temporary file: ${tempFilePath}`);
      }
    }
  },
);

export const generateStudioContentJob = inngest.createFunction(
  { id: "generate-studio-content" },
  { event: "studio/generate.requested" },
  async ({ event }) => {
    await connectDB();

    const { chatId, userId, toolId } = event.data;

    console.log(`Background generating studio content for [${toolId}] in chat ${chatId}`);

    // 1. Gather context from all PDFs in this chat
    const results = await PdfVector.find({
      "metadata.chatId": chatId,
      "metadata.userId": new mongoose.Types.ObjectId(userId)
    }).limit(20);

    const context = results.map(doc => doc.pageContent).join("\n\n");

    if (!context) {
      console.warn(`No context found for chat ${chatId}`);
      return { success: false, message: "No context found" };
    }

    // 2. Call AI Agent
    const generatedContent = await runStudioAgent(toolId, context);

    // 3. Save to database
    await Studio.findOneAndUpdate(
      { chatId, userId, toolId },
      { content: generatedContent },
      { upsert: true, new: true }
    );

    console.log(`Successfully generated and saved [${toolId}] content for chat ${chatId}`);
    return { success: true };
  }
);
