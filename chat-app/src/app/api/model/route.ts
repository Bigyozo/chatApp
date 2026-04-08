import { createMessage } from '@/lib/dynamodb';
import { BedrockRuntimeClient, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// 初始化 Bedrock 客户端
const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'ap-northeast-1',
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined,
});

// Local LLM (LM Studio) config
const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || 'http://127.0.0.1:1234';
const LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL || 'google/gemma-4-26b-a4b';

// 前端显示名 → Bedrock 模型 ID 映射
const MODEL_MAP: Record<string, string> = {
    'Gemma 3 4B': 'google.gemma-3-4b-it',
    'Gemma 3 27B': 'google.gemma-3-27b-it',
    'gpt-oss-20b': 'openai.gpt-oss-20b-1:0',
    'DeepSeek-V3.1': 'deepseek.v3-v1:0'
};

const DEFAULT_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'google.gemma-3-4b-it';

function resolveModelId(model?: string): string {
    if (!model) return DEFAULT_MODEL_ID;
    // 先尝试映射表
    const mapped = MODEL_MAP[model];
    if (mapped) return mapped;
    // 如果前端直接传了 Bedrock 模型 ID，则直接使用
    if (model.startsWith('google.') || model.startsWith('openai.') || model.startsWith('deepseek.')) return model;
    return DEFAULT_MODEL_ID;
}

export async function POST(req: Request) {
    const { messages, chat_id, model } = await req.json();

    console.log('Received messages count:', messages.length);
    console.log('All messages:', JSON.stringify(messages, null, 2));

    const lastMessage = messages[messages.length - 1];
    const lastMessageText = lastMessage.parts?.[0]?.text || lastMessage.content || '';

    console.log('Last message text:', lastMessageText);

    // 保存用户消息到数据库
    if (lastMessageText.trim()) {
        await createMessage(chat_id, 'user', lastMessageText.trim());
    }

    // Local LLM branch (LM Studio OpenAI-compatible API)
    if (model === 'Local-LLM') {
        const openAIMessages = messages
            .map((msg: any) => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: (msg.parts?.[0]?.text || msg.content || '').trim(),
            }))
            .filter((msg: any) => msg.content.length > 0);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const res = await fetch(`${LOCAL_LLM_URL}/v1/chat/completions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: LOCAL_LLM_MODEL,
                            messages: openAIMessages,
                            stream: true,
                            temperature: 0.7,
                            max_tokens: 2048,
                        }),
                    });

                    if (!res.ok || !res.body) {
                        throw new Error(`Local LLM responded with status ${res.status}`);
                    }

                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    let fullText = '';
                    let buffer = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });

                        const lines = buffer.split('\n');
                        buffer = lines.pop() ?? '';

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed.startsWith('data: ')) continue;
                            const data = trimmed.slice(6);
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                const text = parsed.choices?.[0]?.delta?.content;
                                if (text) {
                                    fullText += text;
                                    controller.enqueue(
                                        encoder.encode(`0:${JSON.stringify({ type: 'text-delta', textDelta: text })}\n`)
                                    );
                                }
                            } catch {
                                // skip malformed lines
                            }
                        }
                    }

                    if (fullText) {
                        await createMessage(chat_id, 'assistant', fullText);
                    }

                    controller.enqueue(
                        encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`)
                    );
                    controller.close();
                } catch (error) {
                    console.error('Local LLM streaming error:', error);
                    const msg = error instanceof Error ? error.message : 'Local LLM connection failed';
                    controller.enqueue(
                        encoder.encode(`0:${JSON.stringify({ type: 'text-delta', textDelta: `[エラー] LM Studio に接続できません: ${msg}` })}\n`)
                    );
                    controller.enqueue(encoder.encode(`d:{"finishReason":"error"}\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Vercel-AI-Data-Stream': 'v1',
            },
        });
    }

    // 转换消息格式为 Bedrock Converse API 支持的格式
    const bedrockMessages = messages
        .map((msg: any) => {
            // 获取消息文本
            const text = msg.parts?.[0]?.text || msg.content || '';

            return {
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: [{ text: text.trim() }]
            };
        })
        .filter((msg: any) => msg.content[0].text.length > 0); // 过滤掉空消息

    // 确保至少有一条消息
    if (bedrockMessages.length === 0) {
        console.error('No valid messages after filtering');
        return new Response(JSON.stringify({ error: 'No valid messages' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    console.log('Bedrock messages count:', bedrockMessages.length);
    console.log('Bedrock messages:', JSON.stringify(bedrockMessages, null, 2));

    try {
        // 使用 Converse Stream API
        const command = new ConverseStreamCommand({
            modelId: resolveModelId(model),
            messages: bedrockMessages,
            inferenceConfig: {
                maxTokens: 2048,
                temperature: 0.7,
                topP: 0.9,
            },
            system: [{ text: 'You are a helpful assistant.' }]
        });

        const response = await bedrockClient.send(command);

        // 创建流式响应
        let fullText = '';

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    if (response.stream) {
                        for await (const event of response.stream) {
                            // 处理内容块增量
                            if (event.contentBlockDelta?.delta?.text) {
                                const text = event.contentBlockDelta.delta.text;
                                fullText += text;

                                // 发送流式数据给客户端 - ai-sdk 格式
                                controller.enqueue(
                                    encoder.encode(`0:${JSON.stringify({ type: 'text-delta', textDelta: text })}\n`)
                                );
                            }

                            // 处理消息停止事件
                            if (event.messageStop) {
                                console.log('Message stop reason:', event.messageStop.stopReason);
                            }
                        }
                    }

                    // 保存完整的助手响应到数据库
                    if (fullText) {
                        await createMessage(chat_id, 'assistant', fullText);
                    }

                    // 发送完成信号
                    controller.enqueue(
                        encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`)
                    );

                    controller.close();
                } catch (error) {
                    console.error('Streaming error:', error);
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Vercel-AI-Data-Stream': 'v1',
            },
        });
    } catch (error) {
        console.error('Bedrock API error:', error);
        // 显示更详细的错误信息
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
        console.error('Error details:', errorMessage);
        return new Response(JSON.stringify({
            error: errorMessage,
            details: error
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
