import {
    createChat, deleteChat,
    getChatsByUserId,
    getChatsByUserIdAndChatId, updateChat
} from '@/lib/dynamodb';
import { getUserIdFromRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ALLOWED_MODELS = ['Gemma 3 4B', 'Gemma 3 27B', 'gpt-oss-20b', 'DeepSeek-V3.1'] as const;

const createChatSchema = z.object({
    title: z.string().min(1).max(200),
    model: z.enum(ALLOWED_MODELS),
});

const updateChatSchema = z.object({
    chatId: z.string().min(1),
    updates: z.object({
        title: z.string().min(1).max(200).optional(),
        model: z.enum(ALLOWED_MODELS).optional(),
    }),
});

/** 指定チャットが userId に属するか確認する */
async function verifyOwnership(userId: string, chatId: string): Promise<boolean> {
    const chats = await getChatsByUserIdAndChatId(userId, chatId);
    return chats.length > 0;
}

/**
 * GET /api/chats
 * クエリパラメータ:
 *   - chatId: 単一のチャットレコードを取得（所有者確認あり）
 *   - (なし): 自分の全チャットレコードを取得
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

        if (chatId) {
            const chats = await getChatsByUserIdAndChatId(userId, chatId);
            return NextResponse.json(chats, { status: 200 });
        } else {
            const chats = await getChatsByUserId(userId);
            return NextResponse.json(chats, { status: 200 });
        }
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/chats
 * 新しいチャットレコードを作成する
 * リクエストボディ: { title: string, model: string }
 */
export async function POST(req: NextRequest) {
    let userId: string;
    try {
        userId = await getUserIdFromRequest(req);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const parsed = createChatSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }
        const { title, model } = parsed.data;

        const newChat = await createChat(userId, title, model);
        return NextResponse.json(newChat, { status: 200 });
    } catch (error) {
        console.error('Error in POST /api/chats:', error);
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
    }
}

/**
 * PUT /api/chats
 * チャットレコードを更新する（所有者のみ）
 * リクエストボディ: { chatId: string, updates: Partial<ChatModel> }
 */
export async function PUT(req: NextRequest) {
    let userId: string;
    try {
        userId = await getUserIdFromRequest(req);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const parsed = updateChatSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }
        const { chatId, updates } = parsed.data;

        if (!await verifyOwnership(userId, chatId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedChat = await updateChat(chatId, updates);
        return NextResponse.json(updatedChat, { status: 200 });
    } catch (error) {
        console.error('Error in PUT /api/chats:', error);
        return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
    }
}

/**
 * DELETE /api/chats
 * チャットレコードを削除する（所有者のみ）
 * リクエストボディ: { chatId: string }
 */
export async function DELETE(req: NextRequest) {
    let userId: string;
    try {
        userId = await getUserIdFromRequest(req);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { chatId } = body;

        if (!chatId) {
            return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
        }

        if (!await verifyOwnership(userId, chatId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await deleteChat(chatId);
        return NextResponse.json({ message: 'Chat deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error in DELETE /api/chats:', error);
        return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
    }
}
