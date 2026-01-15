export type ChatModel = {
    id: string;
    userId: string;
    title: string;
    model: string;
    createdAt: string;
}

export type MessageModel = {
    id: string;
    chatId: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}