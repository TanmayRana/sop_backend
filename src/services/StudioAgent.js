import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';

const llm = new ChatOpenAI({
  model: 'llama-3.3-70b-versatile',
  temperature: 0.3,
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: 'https://api.groq.com/openai/v1',
  },
});

// const TOOL_PROMPTS = {
//   quiz: "Create a 10-question multiple-choice quiz based on the context. Ensure questions vary in difficulty (Bloom's Taxonomy). Distractors (wrong options) must be plausible. Return valid JSON: { questions: [{ question: string, options: [string, string, string, string], answer: string, explanation: string }] }",

//   mindmap:
//     'Analyze the core themes and sub-topics of the context to create a hierarchical mind map. Limit to 3 levels of depth for clarity. Return valid JSON: { title: string, children: [{ title: string, children: [{ title: string }] }] }',

//   reports:
//     'Draft a formal executive summary of the provided documents. Focus on objectives, methodology (if apparent), and outcomes. Return valid JSON: { title: string, summary: string, key_findings: [string], action_items: [string], conclusion: string }',

//   flashcards:
//     'Extract 5 high-impact concepts from the context to create study flashcards. Focus on definitions, formulas, or key dates. Return valid JSON: { flashcards: [{ front: string, back: string, category: string }] }',

//   audio:
//     "Write a conversational script for a 2-minute 'Explain Like I'm Five' podcast episode. Use an engaging intro and a summary outro. Return valid JSON: { title: string, script: string, speaker_notes: string }",

//   video:
//     'Develop a visual storyboard for a 60-second educational video. Describe the visual composition and the accompanying narration for 4 key scenes. Return valid JSON: { title: string, scenes: [{ visual_description: string, audio_script: string, duration_seconds: number }] }',

//   infographic:
//     'Identify 5 data points or categorical facts suitable for a visual dashboard. Suggest a specific Lucide-react or FontAwesome icon for each. Return valid JSON: { title: string, points: [{ label: string, value: string, icon_key: string, significance: string }] }',

//   slides:
//     'Design a professional 10-slide presentation outline. Slide 1 is Intro, Slide 5 is Conclusion. Ensure logical flow between points. Return valid JSON: { title: string, slides: [{ slide_number: number, slide_title: string, bullet_points: [string], visual_cue: string }] }',

//   datatable:
//     'Perform Named Entity Recognition (NER) to extract key data (e.g., Names, Metrics, Dates, or Locations) into a structured table. Return valid JSON: { title: string, headers: [string], rows: [[string]] }',

//   notes:
//     'Organize the context into structured Cornell-style study notes. Use Markdown formatting within the content strings for bolding and lists. Return valid JSON: { title: string, sections: [{ heading: string, content: string, keywords: [string] }] }',
// };

const TOOL_PROMPTS = {
  quiz: `Act as an Instructional Designer. Create a 10-question quiz from the context. 
    - Mix: 3 Recall (Easy), 4 Application (Medium), 3 Analysis (Hard). 
    - Distractors must use common misconceptions. 
    - If the context is too short, generate fewer but higher-quality questions.
    Return JSON: { 
      metadata: { total_questions: number, average_difficulty: string },
      questions: [{ id: number, question: string, options: string[], answer: string, explanation: string, difficulty: 'Easy'|'Medium'|'Hard' }] 
    }`,

  mindmap: `Act as a Knowledge Architect. Map the conceptual landscape of the text. 
    - Root: Central Theme. 
    - Level 1: Key Pillars. 
    - Level 2: Supporting Details.
    - Level 3: Specific Examples or Data.
    Return JSON: { title: string, children: [{ title: string, note: string, children: [{ title: string, children: [] }] }] }`,

  reports: `Act as a Senior Business Analyst. Synthesize a professional report.
    - Extract 'Quantifiable Metrics' and 'Qualitative Insights'.
    - Use a neutral, objective tone.
    Return JSON: { title: string, summary: string, key_findings: [{ insight: string, evidence: string }], recommendations: string[], risk_factors: string[], conclusion: string }`,

  flashcards: `Act as a Memory Specialist (using Spaced Repetition principles). 
    - Create 'Concept-to-Definition' and 'Problem-to-Solution' pairs.
    - Ensure each card is atomized (one concept per card).
    Return JSON: { flashcards: [{ front: string, back: string, category: string, study_hint: string }] }`,

  audio: `Act as a Radio Producer. Create a 2-minute podcast script.
    - Include [Sound Effect] markers (e.g., [Upbeat Music Intro]).
    - Use a 'Hook, Meat, Summary' structure.
    Return JSON: { title: string, script: string, segments: [{ timestamp: string, topic: string, content: string }] }`,

  video: `Act as a Creative Director. Create a storyboard for a 60-second explainer video.
    - Balance 'Talking Head' shots with 'Motion Graphic' descriptions.
    Return JSON: { title: string, storyboard: [{ scene_number: number, visual: string, narration: string, on_screen_text: string, duration: number }] }`,

  infographic: `Act as a Data Visualizer. Extract data for a high-impact dashboard.
    - Select icons that match Lucide-react naming conventions.
    - Group data into 'Core Stats' and 'Process Steps'.
    Return JSON: { title: string, data_points: [{ label: string, value: string, trend: 'up'|'down'|'neutral', icon_key: string }], process_steps: string[] }`,

  slides: `Act as a Presentation Coach. Create a narrative-driven slide deck.
    - Apply the '10/20/30' rule (10 slides, 20 mins, 30pt font equivalents).
    - Slide 1: Title, Slide 10: Q&A/Contact.
    Return JSON: { title: string, deck: [{ slide_no: number, header: string, bullets: string[], image_prompt: string, speaker_notes: string }] }`,

  datatable: `Act as a Data Engineer. Extract all entities and numerical data.
    - Identify 'Columns' based on recurring patterns in the text.
    - Sanitize all numerical strings (e.g., $100 -> 100).
    Return JSON: { title: string, schema: [{ key: string, label: string, type: 'string'|'number'|'date' }], rows: [object] }`,

  notes: `Act as an Academic Tutor. Use the Cornell Note-Taking System.
    - 'Cues' section for keywords.
    - 'Notes' section for detailed content.
    - 'Summary' section for synthesis.
    Return JSON: { title: string, sections: [{ heading: string, cues: string[], content: string[] }], final_summary: string }`,
};

export const runStudioAgent = async (toolId, context) => {
  const prompt = TOOL_PROMPTS[toolId] || 'Summarize the context.';

  const response = await llm.invoke([
    new SystemMessage(
      `You are a specialized content creator. ${prompt} Ensure the output is strictly valid JSON and based ONLY on the provided context.`
    ),
    new HumanMessage(`CONTEXT:\n${context}`),
  ]);

  try {
    // Attempt to extract JSON if the model included conversational filler
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : response.content);
  } catch (error) {
    console.error(
      'AI failed to return valid JSON for tool:',
      toolId,
      response.content
    );
    throw new Error('Failed to generate structured content');
  }
};
