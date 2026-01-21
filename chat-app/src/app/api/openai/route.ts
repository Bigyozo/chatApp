import { createMessage } from '@/lib/dynamodb';
import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages, model, chat_id } = await req.json();

    const lastMessage = messages[messages.length - 1];
    console.log('Last message:', lastMessage);
    // 保存用户消息到数据库
    await createMessage(chat_id, 'user', lastMessage.parts[0].text);

    const result = streamText({
        model: openai(model),
        system: 'You are a helpful assistant.',
        messages: convertToModelMessages(messages),
        onFinish: async (result) => {
            await createMessage(chat_id, 'assistant', result.text);
        }
    });

    return result.toUIMessageStreamResponse();
}