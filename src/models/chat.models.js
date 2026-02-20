import { Schema, model } from "mongoose"

const chatSchema = new Schema({
    _id: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: "New Chat"
    },
    pdfIds: [
        {
            type: String
        }
    ],
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    messages: [
        {
            role: String,
            content: Schema.Types.Mixed,
            citations: [
                {
                    id: String,
                    documentName: String,
                    pageNumber: Number,
                    sectionTitle: String
                }
            ],
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, { timestamps: true })

const Chat = model("Chat", chatSchema);
export default Chat;