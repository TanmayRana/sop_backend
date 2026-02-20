import { Schema, model } from "mongoose"

const pdfSchema = new Schema({
    _id: {
        type: String,
        required: true
    },
    pdfName: {
        type: String,
        required: true
    },
    pdfUrl: {
        type: String,
        required: true
    },
    pdf_public_id: {
        type: String,
        required: true
    },
    pdfSize: {
        type: String,
        required: true
    },
    pdfPages: {
        type: String,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    chatId:
    {
        type: String
    },
    pdfVectors: [
        {
            type: Schema.Types.ObjectId,
            ref: "PdfVector"
        }
    ]
}, { timestamps: true })

const Pdf = model("Pdf", pdfSchema);
export default Pdf;