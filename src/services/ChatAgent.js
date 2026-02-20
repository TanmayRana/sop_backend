console.log("=== SCRIPT STARTED ===");

import "dotenv/config";
import { z } from "zod";

import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

/* ----------------------------------
   LLM SETUP (Groq / OpenAI compatible)
---------------------------------- */

const llm = new ChatOpenAI({
  model: "llama-3.3-70b-versatile",
  temperature: 0.2, // allows elaboration but no hallucination
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: "https://api.groq.com/openai/v1",
  },
});

/* ----------------------------------
   INPUT VALIDATION
---------------------------------- */

const InputSchema = z.object({
  question: z.string().min(5),
  context: z.string().optional(),
});

/* ----------------------------------
   RESPONSE SCHEMA (BLOCK-BASED)
---------------------------------- */

const ContentBlockSchema = z.object({
  type: z.enum([
    "answer",
    "explanation",
    "steps",
    "key_points",
    "example",
    "code",
    "warning",
    "limitations",
    "follow_up",
  ]).describe("The type of content block"),
  title: z.string().optional().describe("Optional title for this block"),
  text: z.string().optional().describe("Main text content for the block (used for answer, explanation, code, etc.)"),
  list: z.array(z.string()).optional().describe("Array of strings (used for key_points, follow_up)"),
  steps: z.array(z.object({
    step: z.number(),
    text: z.string()
  })).optional().describe("Array of step objects (used for steps block)"),
});

const BlocksOutputSchema = z.object({
  intent: z.enum(["learning", "exam", "coding", "explanation", "revision"]).describe("Detected user intent"),
  blocks: z.array(ContentBlockSchema).min(3).describe("A series of content blocks providing deep information"),
  confidence: z.number().min(0).max(1).describe("AI confidence score"),
});

/* ----------------------------------
   SYSTEM PROMPT (DEPTH ENFORCED)
---------------------------------- */

const SYSTEM_PROMPT = `
You are an expert-level AI Knowledge Agent specialized in providing deep, structured explanations.

CRITICAL REQUIREMENTS:
- Answers MUST be long, detailed, and explanatory.
- Provide a minimum of 4–6 content blocks.
- Each explanation/answer block MUST be thorough (at least 4–6 sentences).
- Use diverse block types: 'explanation', 'steps', 'example', 'key_points', 'code', etc.
- Assume the user wants a DEEP understanding of the topic.

CONTEXT RULES:
- Use ONLY the provided context from the vector database.
- Do NOT hallucinate facts or use external training data.
- If context is missing for a specific sub-query, use the 'limitations' block to explain why.

TASK:
1. Analyze the question and context carefully.
2. Infer user intent.
3. Plan a multi-section response using the provided block types.
4. Finalize the structured response.
`;

/* ----------------------------------
   LLM NODE
---------------------------------- */

const llmNode = async (state) => {
  const structuredLlm = llm.withStructuredOutput(BlocksOutputSchema, {
    method: "functionCalling"
  });

  const lastUserMessage = state.messages.at(-1);

  const result = await structuredLlm.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    lastUserMessage,
  ]);

  return {
    messages: [
      new AIMessage({
        content: JSON.stringify(result),
      }),
    ],
  };
};

/* ----------------------------------
   LANGGRAPH SETUP
---------------------------------- */

export const ChatLangChainAgent = new StateGraph(MessagesAnnotation)
  .addNode("llm", llmNode)
  .addEdge("__start__", "llm")
  .compile();

/* ----------------------------------
   PUBLIC RUN FUNCTION
---------------------------------- */

export async function runChatAgent(input) {
  const parsed = InputSchema.parse(input);

  const humanPrompt = `
QUESTION:
${parsed.question}

CONTEXT:
${parsed.context ?? "No context available"}
`;

  const result = await ChatLangChainAgent.invoke({
    messages: [new HumanMessage(humanPrompt)],
  });

  try {
    return JSON.parse(result.messages.at(-1).content);
  } catch {
    throw new Error("Model did not return valid JSON");
  }
}
