'use client'
import { ChatModel } from "@/common/type";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

const Navibar: React.FC = () => {

  const router = useRouter();

  const { data: chats } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      return axios.get("/api/chats?all=true").then(res => res.data);
    }
  });

  const pathname = usePathname();

  return (
    <div className="h-screen bg-gray-50">
      <div className="flex items-center justify-center">
        <p className="font-bold text-2xl">ChatApp</p>
      </div>

      <div className="h-10 flex items-center justify-center mt-4 cursor-pointer hover:bg-gray-200"
        onClick={() => {
          router.push('/');
        }}>
        <p className="h-full w-2/3 bg-blue-100 rounded-lg flex items-center justify-center font-thin">
          新しいチャット
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 p-6">
        {chats?.map((chat: ChatModel) => (
          <div key={chat.id}
            className="w-full h-10"
            onClick={() => {
              router.push(`/chat/${chat.id}`);
            }}>
            <p className={`font-extralight text-sm line-clamp-1 ${pathname === `/chat/${chat.id}` ? 'bg-blue-200' : ''}`}>{chat.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Navibar;
