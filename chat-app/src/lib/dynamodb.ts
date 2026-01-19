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

// 初始化 DynamoDB 客户端
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const docClient = DynamoDBDocumentClient.from(client);

const CHAT_TABLE_NAME = 'chatapp_chat';
const MESSAGE_TABLE_NAME = 'chatapp_message';

/**
 * 通过ID获取单个聊天记录
 */
export async function getChatById(chatId: string): Promise<ChatModel | null> {
    try {
        console.log('Getting chat by ID:', chatId);
        const command = new GetCommand({
            TableName: CHAT_TABLE_NAME,
            Key: { id: chatId },
        });
        const response = await docClient.send(command);
        return response.Item as ChatModel | undefined || null;
    } catch (error) {
        console.error('Error getting chat by ID:', error);
        throw error;
    }
}

/**
 * 通过用户ID获取所有聊天记录
 */
export async function getChatsByUserId(userId: string): Promise<ChatModel[]> {
    try {
        const command = new QueryCommand({
            TableName: CHAT_TABLE_NAME,
            IndexName: 'userIdIndex', // 确保DynamoDB中存在这个GSI
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
 * 通过用户ID与Chat ID获取所有聊天记录
 */
export async function getChatsByUserIdAndChatId(userId: string, chatId: string): Promise<ChatModel[]> {
    try {
        console.log('Getting chats by User ID and Chat ID:', userId, chatId);
        // 先通过 userId 查询，然后客户端过滤
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

        // 客户端过滤 chatId
        return items.filter(item => item.id === chatId);
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

/**
 * 获取所有聊天记录
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
 * 创建新的聊天记录
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
 * 更新聊天记录
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
 * 删除聊天记录
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
 * 通过ID获取单个消息
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
 * 通过聊天ID获取所有消息
 */
export async function getMessagesByChatId(chatId: string): Promise<MessageModel[]> {
    try {
        const command = new QueryCommand({
            TableName: MESSAGE_TABLE_NAME,
            IndexName: 'chatIdIndex', // 确保DynamoDB中存在这个GSI
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
 * 获取所有消息
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
 * 创建新的消息
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
 * 更新消息
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
 * 删除消息
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
