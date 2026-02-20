import { Schema, model } from "mongoose"

const pdfVectorSchema = new Schema({
    pageContent: {
        type: String,
        required: true
    },
    embedding: {
        type: [Number],
        required: true
    },
    metadata: {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        chatId: {
            type: String,
            required: true
        },
        pdfId: {
            type: String,
            required: true
        },
        pageNumber: {
            type: Number,
            required: true
        },
        originalName: {
            type: String
        }
    },
})

const PdfVector = model("PdfVector", pdfVectorSchema);
export default PdfVector;