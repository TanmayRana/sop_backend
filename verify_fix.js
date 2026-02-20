import 'dotenv/config';
import { runChatAgent } from './src/services/ChatAgent.js';

async function verify() {
    console.log('Starting verification...');
    const input = {
        question: "Tell me about the SOP structure.",
        context: "The SOP should include an introduction, educational background, work experience, and goals."
    };

    try {
        const output = await runChatAgent(input);
        console.log('Agent Output:', JSON.stringify(output, null, 2));
        console.log('Verification SUCCESSFUL!');
    } catch (error) {
        console.error('Verification FAILED:', error);
    }
}

verify();
