'use client'

import { ErrorDialog } from "@/components/ErrorDialog";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import EastIcon from "@mui/icons-material/East";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "react-oidc-context";

export default function Page() {

  const [input, setInput] = useState("");
  const [model, setModel] = useState("Gemma 3 4B");
  const [errorMessage, setErrorMessage] = useState("");

  const { isListening, isSupported, toggle: toggleSpeech } = useSpeechRecognition({
    onResult: (transcript) => setInput((prev) => prev + transcript),
    lang: 'ja-JP',
  });

  const queryClient = useQueryClient();
  const router = useRouter();
  const auth = useAuth();

  const { mutate: createChat } = useMutation({
    mutationFn: async (input: string) => {
      return axios.post("/api/chats", { title: input, model }, {
        headers: { Authorization: `Bearer ${auth.user?.access_token}` },
      });
    },
    onSuccess: (res) => {
      router.push(`/chat/${res.data.id}?new=true`);
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.error;
        const message = Array.isArray(detail)
          ? detail.map((i: { message: string }) => i.message).join('\n')
          : typeof detail === 'string' ? detail : 'チャットの作成に失敗しました';
        setErrorMessage(message);
      } else {
        setErrorMessage('チャットの作成に失敗しました');
      }
    },
  });

  const handleSubmit = () => {
    if (!input.trim()) return;
    createChat(input);
  };

  return (
    <div className="h-screen flex flex-col items-center">
      <ErrorDialog
        open={!!errorMessage}
        message={errorMessage}
        onClose={() => setErrorMessage("")}
      />
      <div className="h-1/5"></div>
      <div className="w-1/2">
        <p className="text-bold text-2xl text-center">質問をしてみましょう</p>

        <div
          className="flex flex-col items-center justify-center mt-4 shadow-lg
          border-[1px] border-gray-300 h-32 rounded-lg"
        >
          <textarea
            className="w-full rounded-lg p-3 h-30 focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
    </div>
  );
}
