'use client';

import { useEffect } from 'react';
import { useRef } from 'react';
import { useState } from 'react';
import EastIcon from "@mui/icons-material/East";
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useBedrockChat } from '@/hooks/useBedrockChat';

export default function Page() {

    const { chat_id } = useParams();

    const [model, setModel] = useState('Gemma 3 4B');

    const { data: chat } = useQuery({
        queryKey: ['chat', chat_id],
        queryFn: async () => {
            return axios.get(`/api/chats?chatId=${chat_id}`);
        }
    });

    // 从数据库中获取 model 并初始化下拉列表
    useEffect(() => {
        const chatModel = chat?.data?.[0]?.model;
        if (chatModel) {
            setModel(chatModel);
        }
    }, [chat?.data]);

    const { data: previousMessages } = useQuery({
        queryKey: ['messages', chat_id],
        queryFn: async () => {
            const result = await axios.get(`/api/messages?chatId=${chat_id}`);
            return result;
        },
        enabled: !!chat?.data?.[0]?.id,
    });

    // 使用自定义的 Bedrock Chat hook
    const { messages, sendMessage, isLoading, loadHistory } = useBedrockChat(
        typeof chat_id === 'string' ? chat_id : ''
    );

    const [hasInitialized, setHasInitialized] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    // 初始化历史消息 - 只运行一次
    useEffect(() => {
        if (previousMessages?.data && !historyLoaded) {
            const formattedMessages = previousMessages.data
                .filter((msg: any) => msg.content && msg.content.trim().length > 0)
                .map((msg: any) => ({
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    parts: [{ type: 'text', text: msg.content }],
                }));
            loadHistory(formattedMessages);
            setHistoryLoaded(true);
        }
    }, [previousMessages?.data, historyLoaded, loadHistory]);

    const [input, setInput] = useState('');
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSubmit = async () => {
        console.log('handleSubmit clicked, input:', input);
        if (!input.trim()) {
            console.log('Input is empty');
            return;
        }
        try {
            console.log('Sending message:', input);
            await sendMessage(input, model);
            setInput('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // 自动发送第一条消息 - 只运行一次
    useEffect(() => {
        const chatTitle = chat?.data?.[0]?.title;
        const messageCount = previousMessages?.data?.length;

        if (chatTitle && messageCount === 0 && !hasInitialized && historyLoaded) {
            sendMessage(chatTitle, model);
            setHasInitialized(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chat?.data, previousMessages?.data, hasInitialized, historyLoaded]);

    return (
        <div className='flex flex-col h-screen justify-between items-center'>
            <div className='flex flex-col w-2/3 gap-8 overflow-y-auto justify-between flex-1'>
                <div className='h-4'></div>
                <div className='h-flex flex-col w-2/3 gap-8 flex-1'></div>
                {messages.map(message => (
                    <div key={message.id}
                        className={`rounded-lg flex flex-row ${message.role === "assistant" ? "justify-start mr-18" : "justify-end ml-10"}`}
                    >
                        <p className={`inline-block p-2 rounded-lg ${message?.role === "assistant" ?
                            "bg-blue-300 text-black" : "bg-slate-100"}`}>
                            {message.role === 'user' ? 'User: ' : 'AI: '}
                            {message.parts.map((part: any, index: number) =>
                                part.type === 'text' ? <span key={index}>{part.text}</span> : null,
                            )}
                        </p>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start mr-18">
                        <p className="inline-block p-2 rounded-lg bg-gray-200 text-black">
                            AI: <span className="animate-pulse">正在输入...</span>
                        </p>
                    </div>
                )}
            </div>
            <div className='h-4' ref={endRef}>
            </div>

            <div
                className="flex flex-col items-center justify-center shadow-lg
                border-[1px] border-gray-300 h-32 rounded-lg w-2/3 mb-5"
            >
                <textarea
                    className="w-full rounded-lg p-3 h-30 focus:outline-none"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                >
                </textarea>
                <div className="flex flex-row items-center justify-between w-full h-12 mb-2">
                    <select
                        className="ml-2 px-2 py-1 text-sm rounded-lg border
                            border-gray-300 focus:outline-none
                            focus:border-blue-400 cursor-pointer"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                    >
                        <option value="Gemma 3 4B">Gemma-4B</option>
                        <option value="Gemma 3 27B">Gemma-27B</option>
                        <option value="gpt-oss-20b">Chatgpt-20B</option>
                        <option value="DeepSeek-V3.1">DeepSeek</option>
                    </select>
                    <div className="flex items-center justify-center border-2 mr-4 border-black p-1 rounded-full"
                        onClick={handleSubmit}>
                        <EastIcon />
                    </div>
                </div>
            </div>
        </div>
    );
}
