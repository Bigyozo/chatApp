'use client';

import { ErrorDialog } from '@/components/ErrorDialog';
import { useEffect } from 'react';
import { useRef } from 'react';
import { useState } from 'react';
import EastIcon from "@mui/icons-material/East";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useBedrockChat } from '@/hooks/useBedrockChat';
import { useAuth } from 'react-oidc-context';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

export default function Page() {

    const { chat_id } = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const auth = useAuth();
    const isNewChat = searchParams.get('new') === 'true';
    const accessToken = auth.user?.access_token ?? '';

    const [model, setModel] = useState('Gemma 3 4B');

    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const { data: chat } = useQuery({
        queryKey: ['chat', chat_id],
        queryFn: async () => {
            return axios.get(`/api/chats?chatId=${chat_id}`, { headers: authHeader });
        }
    });

    // データベースから model を取得してドロップダウンを初期化する
    useEffect(() => {
        const chatModel = chat?.data?.[0]?.model;
        if (chatModel) {
            setModel(chatModel);
        }
    }, [chat?.data]);

    const { data: previousMessages } = useQuery({
        queryKey: ['messages', chat_id],
        queryFn: async () => {
            return axios.get(`/api/messages?chatId=${chat_id}`, { headers: authHeader });
        },
        enabled: !!chat?.data?.[0]?.id,
    });

    // カスタムの Bedrock Chat フックを使用する
    const { messages, sendMessage, isLoading, error, clearError, loadHistory, clearMessages } = useBedrockChat(
        typeof chat_id === 'string' ? chat_id : '',
        accessToken
    );

    const [hasInitialized, setHasInitialized] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    // chat_id 変更時に状態をリセットする
    useEffect(() => {
        setHasInitialized(false);
        setHistoryLoaded(false);
        clearMessages();
    }, [chat_id, clearMessages]);

    // 履歴メッセージを初期化する - 一度のみ実行
    useEffect(() => {
        if (isNewChat) {
            setHistoryLoaded(true);
        } else {
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
        }
    }, [isNewChat, previousMessages?.data, historyLoaded, loadHistory]);

    const [input, setInput] = useState('');
    const endRef = useRef<HTMLDivElement>(null);

    const { isListening, isSupported, toggle: toggleSpeech } = useSpeechRecognition({
        onResult: (transcript) => setInput((prev) => prev + transcript),
        lang: 'ja-JP',
    });

    useEffect(() => {
        if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    /** 入力テキストを Bedrock へ送信し、送信後にテキストエリアをクリアする */
    const handleSubmit = async () => {
        if (!input.trim()) return;
        try {
            await sendMessage(input, model);
            setInput('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // 最初のメッセージを自動送信する - 新規チャット時のみ（URL に ?new=true を含む場合）
    useEffect(() => {
        const chatTitle = chat?.data?.[0]?.title;
        if (isNewChat && chatTitle && !hasInitialized) {
            sendMessage(chatTitle, model);
            setHasInitialized(true);
            // リロード時の二重送信防止のため URL から ?new=true を削除する
            router.replace(`/chat/${chat_id}`, { scroll: false });
        }
    }, [chat?.data, isNewChat, hasInitialized]);

    return (
        <div className='flex flex-col h-screen justify-between items-center'>
            <ErrorDialog
                open={!!error}
                message={error?.message ?? ''}
                onClose={clearError}
            />
            <div className='flex flex-col w-2/3 gap-8 overflow-y-auto justify-between flex-1'>
                <div className='h-4'></div>
                <div className='flex flex-col w-2/3 gap-8 flex-1'></div>
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
                            AI: <span className="animate-pulse">入力中...</span>
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
                    <div className="flex items-center gap-2 mr-4">
                        {isSupported && (
                            <div
                                className={`flex items-center justify-center border-2 p-1 rounded-full cursor-pointer transition-colors
                                    ${isListening ? 'border-red-500 text-red-500 animate-pulse' :
                                        'border-gray-400 text-gray-600 hover:border-blue-400 hover:text-blue-500'}`}
                                onClick={toggleSpeech}
                                title={isListening ? '音声停止' : '音声入力'}
                            >
                                {isListening ? <MicOffIcon /> : <MicIcon />}
                            </div>
                        )}
                        <div className="flex items-center justify-center border-2 border-black p-1 rounded-full cursor-pointer"
                            onClick={handleSubmit}>
                            <EastIcon />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
