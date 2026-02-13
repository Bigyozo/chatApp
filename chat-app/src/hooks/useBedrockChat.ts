import { useState, useCallback } from 'react';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    parts: Array<{ type: string; text: string }>;
}

export function useBedrockChat(chatId: string, model?: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const sendMessage = useCallback(async (text: string) => {
        const trimmedText = text.trim();
        if (!trimmedText) return;

        setIsLoading(true);
        setError(null);

        // 创建用户消息
        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: trimmedText,
            parts: [{ type: 'text', text: trimmedText }]
        };

        // 立即显示用户消息
        setMessages(prev => [...prev, userMessage]);

        // 创建助手消息占位符
        const assistantMessageId = crypto.randomUUID();
        const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            parts: [{ type: 'text', text: '' }]
        };

        setMessages(prev => [...prev, assistantMessage]);

        try {
            // 构建请求消息列表（包括历史消息）- 过滤空消息
            const allMessages = [...messages, userMessage]
                .filter(msg => msg.content && msg.content.trim().length > 0)
                .map(msg => ({
                    role: msg.role,
                    parts: msg.parts
                }));

            // 发送请求到 API
            const response = await fetch("/api/model", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
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

            // 处理流式响应
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
                        // 尝试解析 ai-sdk 格式
                        if (line.startsWith('0:')) {
                            const data = JSON.parse(line.substring(2));
                            if (data.type === 'text-delta' && data.textDelta) {
                                assistantText += data.textDelta;
                            }
                        } else {
                            // 尝试解析纯 JSON 格式
                            const data = JSON.parse(line);
                            if (data.text) {
                                assistantText += data.text;
                            } else if (data.textDelta) {
                                assistantText += data.textDelta;
                            }
                        }

                        // 更新助手消息
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
                        // 忽略解析错误，可能是不完整的 JSON
                        console.debug('Parse error:', e);
                    }
                }
            }

        } catch (err) {
            console.error('Send message error:', err);
            setError(err instanceof Error ? err : new Error('Unknown error'));

            // 移除失败的助手消息
            setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
        } finally {
            setIsLoading(false);
        }
    }, [messages, chatId, model]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

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
