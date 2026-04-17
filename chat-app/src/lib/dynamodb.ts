import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    QueryCommand,
    ScanCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { ChatModel, MessageModel } from '../common/type';

// DynamoDB クライアントを初期化する
// AWS 認証情報の環境変数が提供されていれば使用する
// それ以外はデフォルトの認証チェーン（IAM ロール、環境変数など）を使用する
const clientConfig: any = {
    region: process.env.AWS_REGION || 'ap-northeast-1',
};

// AWS 認証情報が明示的に設定されている場合のみ credentials を追加する
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
}

const client = new DynamoDBClient(clientConfig);

const docClient = DynamoDBDocumentClient.from(client);

const CHAT_TABLE_NAME = 'chatapp_chat';
const MESSAGE_TABLE_NAME = 'chatapp_message';


/**
 * ユーザー ID で全チャットレコードを取得する
 */
export async function getChatsByUserId(userId: string): Promise<ChatModel[]> {
    try {
        const command = new QueryCommand({
            TableName: CHAT_TABLE_NAME,
            IndexName: 'userIdIndex', // DynamoDB にこの GSI が存在することを確認する
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
        });
        const response = await docClient.send(command);
        return (response.Items as ChatModel[]) || [];
    } catch (error) {
        console.error('Error getting chats by user ID:', error);
        throw error;
    }
}

/**
 * ユーザー ID とチャット ID で全チャットレコードを取得する
 */
export async function getChatsByUserIdAndChatId(userId: string, chatId: string): Promise<ChatModel[]> {
    try {
        console.log('Getting chats by User ID and Chat ID:', userId, chatId);
        // まず userId でクエリし、クライアント側でフィルタリングする
        const command = new QueryCommand({
            TableName: CHAT_TABLE_NAME,
            IndexName: 'userIdIndex',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
        });
        const response = await docClient.send(command);
        const items = (response.Items as ChatModel[]) || [];

        // chatId でクライアントフィルタリングする
        return items.filter(item => item.id === chatId);
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

/**
 * 全チャットレコードを取得する
 */
export async function getAllChats(): Promise<ChatModel[]> {
    try {
        const command = new ScanCommand({
            TableName: CHAT_TABLE_NAME,
        });
        const response = await docClient.send(command);
        return (response.Items as ChatModel[]) || [];
    } catch (error) {
        console.error('Error scanning all chats:', error);
        throw error;
    }
}

/**
 * 新しいチャットレコードを作成する
 */
export async function createChat(userId: string, title: string, model: string): Promise<ChatModel> {
    try {
        const chat: ChatModel = {
            id: crypto.randomUUID(),
            userId,
            title,
            model,
            createdAt: new Date().toISOString(),
        };
        const command = new PutCommand({
            TableName: CHAT_TABLE_NAME,
            Item: chat,
        });
        await docClient.send(command);
        return chat;
    } catch (error) {
        console.error('Error creating chat:', error);
        throw error;
    }
}

/**
 * チャットレコードを更新する
 */
export async function updateChat(chatId: string, updates: Partial<ChatModel>): Promise<ChatModel> {
    try {
        const command = new UpdateCommand({
            TableName: CHAT_TABLE_NAME,
            Key: { id: chatId },
            UpdateExpression: 'SET ' + Object.keys(updates)
                .map((key, i) => `${key} = :val${i}`)
                .join(', '),
            ExpressionAttributeValues: Object.keys(updates).reduce((acc, key, i) => ({
                ...acc,
                [`:val${i}`]: updates[key as keyof ChatModel],
            }), {}),
            ReturnValues: 'ALL_NEW',
        });
        const response = await docClient.send(command);
        return response.Attributes as ChatModel;
    } catch (error) {
        console.error('Error updating chat:', error);
        throw error;
    }
}

/**
 * チャットレコードを削除する
 */
export async function deleteChat(chatId: string): Promise<void> {
    try {
        const command = new DeleteCommand({
            TableName: CHAT_TABLE_NAME,
            Key: { id: chatId },
        });
        await docClient.send(command);
    } catch (error) {
        console.error('Error deleting chat:', error);
        throw error;
    }
}

// ==================== Message Operations ====================

/**
 * ID で単一のメッセージを取得する
 */
export async function getMessageById(messageId: string): Promise<MessageModel | null> {
    try {
        const command = new GetCommand({
            TableName: MESSAGE_TABLE_NAME,
            Key: { id: messageId },
        });
        const response = await docClient.send(command);
        return response.Item as MessageModel | undefined || null;
    } catch (error) {
        console.error('Error getting message by ID:', error);
        throw error;
    }
}

/**
 * チャット ID で全メッセージを取得する
 */
export async function getMessagesByChatId(chatId: string): Promise<MessageModel[]> {
    try {
        const command = new QueryCommand({
            TableName: MESSAGE_TABLE_NAME,
            IndexName: 'chatIdIndex', // DynamoDB にこの GSI が存在することを確認する
            KeyConditionExpression: 'chatId = :chatId',
            ExpressionAttributeValues: {
                ':chatId': chatId,
            }
        });
        const response = await docClient.send(command);
        return (response.Items as MessageModel[]) || [];
    } catch (error) {
        console.error('Error getting messages by chat ID:', error);
        throw error;
    }
}

/**
 * 全メッセージを取得する
 */
export async function getAllMessages(): Promise<MessageModel[]> {
    try {
        const command = new ScanCommand({
            TableName: MESSAGE_TABLE_NAME,
        });
        const response = await docClient.send(command);
        return (response.Items as MessageModel[]) || [];
    } catch (error) {
        console.error('Error scanning all messages:', error);
        throw error;
    }
}

/**
 * 新しいメッセージを作成する
 */
export async function createMessage(chatId: string, role: 'user' | 'assistant', content: string): Promise<MessageModel> {
    try {
        const message: MessageModel = {
            id: crypto.randomUUID(),
            chatId,
            role,
            content,
            createdAt: new Date().toISOString(),
        };
        const command = new PutCommand({
            TableName: MESSAGE_TABLE_NAME,
            Item: message,
        });
        await docClient.send(command);
        return message;
    } catch (error) {
        console.error('Error creating message:', error);
        throw error;
    }
}

/**
 * メッセージを更新する
 */
export async function updateMessage(messageId: string, updates: Partial<MessageModel>): Promise<MessageModel> {
    try {
        const command = new UpdateCommand({
            TableName: MESSAGE_TABLE_NAME,
            Key: { id: messageId },
            UpdateExpression: 'SET ' + Object.keys(updates)
                .map((key, i) => `${key} = :val${i}`)
                .join(', '),
            ExpressionAttributeValues: Object.keys(updates).reduce((acc, key, i) => ({
                ...acc,
                [`:val${i}`]: updates[key as keyof MessageModel],
            }), {}),
            ReturnValues: 'ALL_NEW',
        });
        const response = await docClient.send(command);
        return response.Attributes as MessageModel;
    } catch (error) {
        console.error('Error updating message:', error);
        throw error;
    }
}

/**
 * メッセージを削除する
 */
export async function deleteMessage(messageId: string): Promise<void> {
    try {
        const command = new DeleteCommand({
            TableName: MESSAGE_TABLE_NAME,
            Key: { id: messageId },
        });
        await docClient.send(command);
    } catch (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
}
