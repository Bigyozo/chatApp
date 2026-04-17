import { useState, useCallback } from 'react';

// crypto.randomUUID が使えない環境向けのフォールバック
function generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    parts: Array<{ type: string; text: string }>;
}

/**
 * Bedrock へのメッセージ送信・ストリーミング受信・履歴管理を行うカスタムフック
 */
export function useBedrockChat(chatId: string, accessToken: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const sendMessage = useCallback(async (text: string, model: string) => {
        const trimmedText = text.trim();
        if (!trimmedText) return;

        setIsLoading(true);
        setError(null);

        // ユーザーメッセージを作成する
        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content: trimmedText,
            parts: [{ type: 'text', text: trimmedText }]
        };

        // ユーザーメッセージを即時表示する
        setMessages(prev => [...prev, userMessage]);

        // アシスタントメッセージのプレースホルダーを作成する
        const assistantMessageId = generateId();
        const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            parts: [{ type: 'text', text: '' }]
        };

        setMessages(prev => [...prev, assistantMessage]);

        try {
            // リクエストメッセージリストを構築する（履歴含む）- 空メッセージを除外
            const allMessages = [...messages, userMessage]
                .filter(msg => msg.content && msg.content.trim().length > 0)
                .map(msg => ({
                    role: msg.role,
                    parts: msg.parts
                }));

            // API にリクエストを送信する
            const response = await fetch("/api/model", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    messages: allMessages,
                    chat_id: chatId,
                    model
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            // ストリーミングレスポンスを処理する
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        // ai-sdk 形式のパースを試みる
                        if (line.startsWith('0:')) {
                            const data = JSON.parse(line.substring(2));
                            if (data.type === 'text-delta' && data.textDelta) {
                                assistantText += data.textDelta;
                            }
                        } else {
                            // 純粋な JSON 形式のパースを試みる
                            const data = JSON.parse(line);
                            if (data.text) {
                                assistantText += data.text;
                            } else if (data.textDelta) {
                                assistantText += data.textDelta;
                            }
                        }

                        // アシスタントメッセージを更新する
                        setMessages(prev => prev.map(msg =>
                            msg.id === assistantMessageId
                                ? {
                                    ...msg,
                                    content: assistantText,
                                    parts: [{ type: 'text', text: assistantText }]
                                }
                                : msg
                        ));
                    } catch (e) {
                        // 不完全な JSON の可能性があるためパースエラーを無視する
                        console.debug('Parse error:', e);
                    }
                }
            }

        } catch (err) {
            console.error('Send message error:', err);
            setError(err instanceof Error ? err : new Error('Unknown error'));

            // 失敗したアシスタントメッセージを削除する
            setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
        } finally {
            setIsLoading(false);
        }
    }, [messages, chatId, accessToken]);

    /** メッセージ一覧をリセットする */
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    /** DynamoDB から取得した履歴メッセージをセットする */
    const loadHistory = useCallback((historyMessages: Message[]) => {
        setMessages(historyMessages);
    }, []);

    return {
        messages,
        sendMessage,
        isLoading,
        error,
        clearMessages,
        loadHistory
    };
}
