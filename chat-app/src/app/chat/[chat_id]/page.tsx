'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useEffect } from 'react';
import { useRef } from 'react';
import { useState } from 'react';
import EastIcon from "@mui/icons-material/East";
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function Page() {

    const { chat_id } = useParams();

    const [model, setModel] = useState('gpt-4.1-mini');

    const handleChangeModel = () => {
        setModel(model === 'gpt-4.1-mini' ? 'deepseek' : 'gpt-4.1-mini');
    };

    const { data: chat } = useQuery({
        queryKey: ['chat', chat_id],
        queryFn: async () => {
            return axios.get(`/api/chats?chatId=${chat_id}`);
        }
    });

    const { data: previousMessages } = useQuery({
        queryKey: ['messages', chat_id],
        queryFn: async () => {
            return axios.get(`/api/messages?chatId=${chat_id}`);
        },
        enabled: !!chat?.data?.[0]?.id,
    });

    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/openai',
            body: { model, chat_id },
        })
    });

    const [allMessages, setAllMessages] = useState<UIMessage[]>([]);

    // 初始化历史消息
    useEffect(() => {
        if (previousMessages?.data) {
            const formattedMessages = previousMessages.data.map((msg: any) => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                parts: [{ type: 'text', text: msg.content }],
            }));
            setAllMessages(formattedMessages);
        }
    }, [previousMessages?.data]);

    // 追加新消息
    useEffect(() => {
        if (messages.length > 0) {
            setAllMessages(prev => {
                const prevIds = prev.map(msg => msg.id);
                const newMsgs = messages.filter(msg => !prevIds.includes(msg.id));
                return [...prev, ...newMsgs];
            });
        }
    }, [messages]);


    const [input, setInput] = useState('');

    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [allMessages]);


    const handleSubmit = async () => {
        console.log('handleSubmit clicked, input:', input);
        if (!input.trim()) {
            console.log('Input is empty');
            return;
        }
        try {
            console.log('Sending message:', input);
            await sendMessage({ text: input });
            setInput('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div className='flex flex-col h-screen justify-between items-center'>
            <div className='flex flex-col w-2/3 gap-8 overflow-y-auto justify-between flex-1'>
                <div className='h-4'></div>
                <div className='h-flex flex-col w-2/3 gap-8 flex-1'></div>
                {allMessages.map(message => (
                    <div key={message.id}
                        className={`rounded-lg flex flex-row ${message.role === "assistant" ? "justify-start mr-18" : "justify-end ml-10"}`}
                    >
                        <p className={`inline-block p-2 rounded-lg ${message?.role === "assistant" ?
                            "bg-blue-300 text-black" : "bg-slate-100"}`}>
                            {message.role === 'user' ? 'User: ' : 'AI: '}
                            {message.parts.map((part, index) =>
                                part.type === 'text' ? <span key={index}>{part.text}</span> : null,
                            )}
                        </p>
                    </div>
                ))}
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
                >
                </textarea>
                <div className="flex flex-row items-center justify-between w-full h-12 mb-2">
                    <div>
                        <div className={`flex flex-row items-center justify-center rounded-lg border-[1px] px-2 py-1 ml-2 cursor-pointer
                            ${model === 'gpt-4' ? "border-blue-300 bg-blue-200" : "border-gray-300"}`} onClick={handleChangeModel}>
                            <p className="text-sm">gpt-4</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-center border-2 mr-4 border-black p-1 rounded-full"
                        onClick={handleSubmit}>
                        <EastIcon />
                    </div>
                </div>
            </div>
        </div>
    );
}