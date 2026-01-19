import { NextRequest, NextResponse } from 'next/server';
import {
    getMessagesByChatId,
    createMessage,
    updateMessage,
    deleteMessage,
} from '@/lib/dynamodb';

/**
 * GET /api/messages
 * 查询参数:
 *   - chatId: 获取该聊天的所有消息
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const chatId = searchParams.get('chatId');

        if (chatId) {
            const messages = await getMessagesByChatId(chatId);
            return NextResponse.json(messages);
        } else {
            return NextResponse.json(
                { error: 'Missing required query parameters' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: (error as Error).message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/messages
 * 创建新消息
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const message = await createMessage(body.chatId, body.role, body.content);
        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: (error as Error).message },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/messages
 * 更新消息
 * Body: { messageId: string, updates: Partial<MessageModel> }
 */
export async function PUT(request: NextRequest) {
    try {
        const { messageId, updates } = await request.json();
        if (!messageId) {
            return NextResponse.json(
                { error: 'messageId is required' },
                { status: 400 }
            );
        }
        const message = await updateMessage(messageId, updates);
        return NextResponse.json(message);
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: (error as Error).message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/messages
 * 删除消息
 * Query: ?messageId=xxx
 */
export async function DELETE(request: NextRequest) {
    try {
        const messageId = request.nextUrl.searchParams.get('messageId');
        if (!messageId) {
            return NextResponse.json(
                { error: 'messageId is required' },
                { status: 400 }
            );
        }
        await deleteMessage(messageId);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: (error as Error).message },
            { status: 500 }
        );
    }
}
