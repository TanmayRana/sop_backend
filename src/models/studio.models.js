import { Schema, model } from "mongoose";

const studioSchema = new Schema({
    chatId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    toolId: {
        type: String,
        required: true,
        enum: ["audio", "video", "mindmap", "reports", "flashcards", "quiz", "infographic", "slides", "datatable", "notes"]
    },
    content: {
        type: Schema.Types.Mixed,
        required: true
    },
    metadata: {
        type: Schema.Types.Mixed
    }
}, { timestamps: true });

const Studio = model("Studio", studioSchema);
export default Studio;
