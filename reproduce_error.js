import { RemoveMessage } from '@langchain/core/messages';
import { MessagesValue } from '@langchain/langgraph';

console.log('RemoveMessage:', RemoveMessage);
console.log('RemoveMessage.isInstance:', RemoveMessage.isInstance);

try {
    const reducer = MessagesValue.reducer;
    console.log('Reducer type:', typeof reducer);

    // Simulate what the reducer does
    const existingMessages = [];
    const newMessages = [{ role: 'assistant', content: 'test' }];

    const result = reducer(existingMessages, newMessages);
    console.log('Reducer worked fine with plain object');
} catch (error) {
    console.error('Reducer failed:', error);
}
