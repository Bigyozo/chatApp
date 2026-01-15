import { NextRequest, NextResponse } from 'next/server';
import { getChatById, getChatsByUserId, getAllChats } from '@/lib/dynamodb';

/**
 * GET /api/chats
 * 查询参数:
 *   - chatId: 获取单个聊天记录
 *   - userId: 获取该用户的所有聊天记录
 *   - all: true 获取所有聊天记录
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const chatId = searchParams.get('chatId');
        const userId = searchParams.get('userId');
        const all = searchParams.get('all');

        if (chatId) {
            const chat = await getChatById(chatId);
            return NextResponse.json(chat);
        } else if (userId) {
            const chats = await getChatsByUserId(userId);
            return NextResponse.json(chats);
        } else if (all === 'true') {
            const chats = await getAllChats();
            return NextResponse.json(chats);
        } else {
            return NextResponse.json(
                { error: 'Missing required query parameters' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}


