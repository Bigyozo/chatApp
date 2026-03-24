'use client'

import EastIcon from "@mui/icons-material/East";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "react-oidc-context";
export default function Page() {

  const [input, setInput] = useState("");
  const [model, setModel] = useState("Gemma 3 4B");

  const queryClient = useQueryClient();
  const router = useRouter();
  const auth = useAuth();

  const { mutate: createChat } = useMutation({
    mutationFn: async (input: string) => {
      return axios.post("/api/chats", { userId: auth.user?.profile.sub, title: input, model });
    },
    onSuccess: (res) => {
      console.log("Mutation successful:", res);
      router.push(`/chat/${res.data.id}?new=true`);
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    }
  });

  const handleSubmit = () => {
    if (!input.trim()) {
      console.log("Input is empty");
      return;
    }
    createChat(input);
  };

  return (
    <div className="h-screen flex flex-col items-center">
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
            <div className="flex items-center justify-center border-2 mr-4 border-black p-1 rounded-full" onClick={handleSubmit}>
              <EastIcon />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
