import { NextRequest, NextResponse } from 'next/server';
import {
    getChatsByUserIdAndChatId,
    getMessagesByChatId,
    createMessage,
    updateMessage,
    deleteMessage,
} from '@/lib/dynamodb';
import { getUserIdFromRequest } from '@/lib/auth';

/** 指定チャットが userId に属するか確認する */
async function verifyOwnership(userId: string, chatId: string): Promise<boolean> {
    const chats = await getChatsByUserIdAndChatId(userId, chatId);
    return chats.length > 0;
}

/**
 * GET /api/messages
 * クエリパラメータ:
 *   - chatId: 該当チャットの全メッセージを取得（所有者確認あり）
 */
export async function GET(request: NextRequest) {
    let userId: string;
    try {
        userId = await getUserIdFromRequest(request);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const chatId = request.nextUrl.searchParams.get('chatId');
        if (!chatId) {
            return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
        }

        if (!await verifyOwnership(userId, chatId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const messages = await getMessagesByChatId(chatId);
        return NextResponse.json(messages);
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/messages
 * 新しいメッセージを作成する（チャット所有者確認あり）
 */
export async function POST(request: NextRequest) {
    let userId: string;
    try {
        userId = await getUserIdFromRequest(request);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        if (!await verifyOwnership(userId, body.chatId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const message = await createMessage(body.chatId, body.role, body.content);
        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PUT /api/messages
 * メッセージを更新する
 * Body: { messageId: string, updates: Partial<MessageModel> }
 */
export async function PUT(request: NextRequest) {
    try {
        await getUserIdFromRequest(request);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { messageId, updates } = await request.json();
        if (!messageId) {
            return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
        }
        const message = await updateMessage(messageId, updates);
        return NextResponse.json(message);
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/messages
 * メッセージを削除する
 * Query: ?messageId=xxx
 */
export async function DELETE(request: NextRequest) {
    try {
        await getUserIdFromRequest(request);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const messageId = request.nextUrl.searchParams.get('messageId');
        if (!messageId) {
            return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
        }
        await deleteMessage(messageId);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
