import {
    createChat, deleteChat, getAllChats,
    getChatsByUserIdAndChatId, updateChat
} from '@/lib/dynamodb';
import { NextRequest, NextResponse } from 'next/server';

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
        const userId = 'user123'; // 临时使用固定用户ID，后续应从认证系统获取
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
        } else if (all === 'true') {
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
 * POST 方法：创建新的聊天记录
 * 请求体：{ userId: string, title: string, model: string }
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
 * PUT 方法：更新聊天记录
 * 请求体：{ chatId: string, updates: Partial<ChatModel> }
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
 * DELETE 方法：删除聊天记录
 * 请求体：{ chatId: string }
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

