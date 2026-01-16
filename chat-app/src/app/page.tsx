'use client'

import EastIcon from "@mui/icons-material/East";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Page() {

  const [input, setInput] = useState("");
  const [model, setModel] = useState("gpt-4");

  const queryClient = useQueryClient();
  const router = useRouter();

  const { mutate: createChat } = useMutation({
    mutationFn: async (input: string) => {
      return axios.post("/api/chats", { userId: "user123", title: input, model });
    },
    onSuccess: (res) => {
      console.log("Mutation successful:", res);
      router.push(`/chat/${res.data.id}`);
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
            <div>
              <div className={`flex flex-row items-center justify-center rounded-lg border-[1px] px-2 py-1 ml-2 
              cursor-pointer ${model === 'gpt-4' ? "border-blue-300 bg-blue-200" : "border-gray-300"}`}>
                <p className="text-sm">gpt-4</p>
              </div>
            </div>
            <div className="flex items-center justify-center border-2 mr-4 border-black p-1 rounded-full" onClick={handleSubmit}>
              <EastIcon />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
