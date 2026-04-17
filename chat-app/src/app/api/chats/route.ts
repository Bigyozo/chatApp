import {
    createChat, deleteChat, getAllChats,
    getChatsByUserId,
    getChatsByUserIdAndChatId, updateChat
} from '@/lib/dynamodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/chats
 * クエリパラメータ:
 *   - chatId: 単一のチャットレコードを取得
 *   - userId: 該当ユーザーの全チャットレコードを取得
 *   - all: true 全チャットレコードを取得
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const chatId = searchParams.get('chatId');
        const userId = searchParams.get('userId');
        const all = searchParams.get('all');

        if(!userId) {
            return NextResponse.json(
                { error: 'Unauthorized: userId is required' },
                { status: 401 }
            );
        }

        if (chatId && userId) {
            const chats = await getChatsByUserIdAndChatId(userId, chatId);
            return NextResponse.json(chats, { status: 200 });
        }else if (userId) {
            const chats = await getChatsByUserId(userId);
            return NextResponse.json(chats, { status: 200 });
        }
        else if (all === 'true') {
            const chats = await getAllChats();
            return NextResponse.json(chats, { status: 200 });
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


/**
 * POST /api/chats
 * 新しいチャットレコードを作成する
 * リクエストボディ: { userId: string, title: string, model: string }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, title, model } = body;

        if (!userId || !title || !model) {
            return NextResponse.json(
                { error: "userId, title, and model are required" },
                { status: 400 }
            );
        }

        const newChat = await createChat(userId, title, model);
        return NextResponse.json(newChat, { status: 200 });
    } catch (error) {
        console.error("Error in POST /api/database:", error);
        return NextResponse.json(
            { error: "Failed to create chat" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/chats
 * チャットレコードを更新する
 * リクエストボディ: { chatId: string, updates: Partial<ChatModel> }
 */
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { chatId, updates } = body;

        if (!chatId || !updates) {
            return NextResponse.json(
                { error: "chatId and updates are required" },
                { status: 400 }
            );
        }

        const updatedChat = await updateChat(chatId, updates);
        return NextResponse.json(updatedChat, { status: 200 });
    } catch (error) {
        console.error("Error in PUT /api/database:", error);
        return NextResponse.json(
            { error: "Failed to update chat" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/chats
 * チャットレコードを削除する
 * リクエストボディ: { chatId: string }
 */
export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { chatId } = body;

        if (!chatId) {
            return NextResponse.json(
                { error: "chatId is required" },
                { status: 400 }
            );
        }

        await deleteChat(chatId);
        return NextResponse.json(
            { message: "Chat deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in DELETE /api/database:", error);
        return NextResponse.json(
            { error: "Failed to delete chat" },
            { status: 500 }
        );
    }
}
