import { createMessage } from '@/lib/dynamodb';
import { BedrockRuntimeClient, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Bedrock クライアントを初期化する
const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'ap-northeast-1',
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined,
});

// フロントエンド表示名 → Bedrock モデル ID のマッピング
const MODEL_MAP: Record<string, string> = {
    'Gemma 3 4B': 'google.gemma-3-4b-it',
    'Gemma 3 27B': 'google.gemma-3-27b-it',
    'gpt-oss-20b': 'openai.gpt-oss-20b-1:0',
    'DeepSeek-V3.1': 'deepseek.v3-v1:0'
};

const DEFAULT_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'google.gemma-3-4b-it';

/**
 * フロントエンドのモデル名を Bedrock モデル ID に解決する
 * マッピングにない場合はデフォルトモデルを使用する
 */
function resolveModelId(model?: string): string {
    if (!model) return DEFAULT_MODEL_ID;
    // まずマッピングテーブルで検索する
    const mapped = MODEL_MAP[model];
    if (mapped) return mapped;
    // フロントエンドが直接 Bedrock モデル ID を渡した場合はそのまま使用する
    if (model.startsWith('google.') || model.startsWith('openai.') || model.startsWith('deepseek.')) return model;
    return DEFAULT_MODEL_ID;
}

/**
 * POST /api/model
 * Bedrock Converse Stream API を使ってメッセージを送信し、ストリーミングレスポンスを返す
 */
export async function POST(req: Request) {
    const { messages, chat_id, model } = await req.json();

    console.log('Received messages count:', messages.length);
    console.log('All messages:', JSON.stringify(messages, null, 2));

    const lastMessage = messages[messages.length - 1];
    const lastMessageText = lastMessage.parts?.[0]?.text || lastMessage.content || '';

    console.log('Last message text:', lastMessageText);

    // ユーザーメッセージをデータベースに保存する
    if (lastMessageText.trim()) {
        await createMessage(chat_id, 'user', lastMessageText.trim());
    }

    // メッセージを Bedrock Converse API がサポートする形式に変換する
    const bedrockMessages = messages
        .map((msg: any) => {
            // メッセージテキストを取得する
            const text = msg.parts?.[0]?.text || msg.content || '';

            return {
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: [{ text: text.trim() }]
            };
        })
        .filter((msg: any) => msg.content[0].text.length > 0); // 空メッセージを除外する

    // 少なくとも1件のメッセージがあることを確認する
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
        // Converse Stream API を使用する
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

        // ストリーミングレスポンスを生成する
        let fullText = '';

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    if (response.stream) {
                        for await (const event of response.stream) {
                            // コンテンツブロックの差分を処理する
                            if (event.contentBlockDelta?.delta?.text) {
                                const text = event.contentBlockDelta.delta.text;
                                fullText += text;

                                // クライアントへストリームデータを送信する（ai-sdk 形式）
                                controller.enqueue(
                                    encoder.encode(`0:${JSON.stringify({ type: 'text-delta', textDelta: text })}\n`)
                                );
                            }

                            // メッセージ停止イベントを処理する
                            if (event.messageStop) {
                                console.log('Message stop reason:', event.messageStop.stopReason);
                            }
                        }
                    }

                    // アシスタントの完全なレスポンスをデータベースに保存する
                    if (fullText) {
                        await createMessage(chat_id, 'assistant', fullText);
                    }

                    // 完了シグナルを送信する
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
        // より詳細なエラー情報を表示する
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
