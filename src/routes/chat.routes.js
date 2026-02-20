import express from "express";
import { uploadPdf } from "../controllers/upload.controller.js";
import {
    chatWithPdf,
    getpdfs,
    createChat,
    getChats,
    updateChat,
    deleteChat,
    getAllUserPdfs,
    chatRename
} from "../controllers/chat.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import multer from "multer";
import os from "os";

const router = express.Router();

// Multer setup for temporary file storage
const upload = multer({ dest: os.tmpdir() });

router.post("/upload", authenticate, upload.array("pdfs"), uploadPdf);
router.post("/message", authenticate, chatWithPdf);
router.get("/pdfs/:chatId", authenticate, getpdfs);
router.get("/all-pdfs", authenticate, getAllUserPdfs);

// Chat CRUD
router.post("/", authenticate, createChat);
router.get("/", authenticate, getChats);
router.patch("/", authenticate, updateChat);
router.delete("/", authenticate, deleteChat);
router.patch("/rename", authenticate, chatRename);

export default router;
