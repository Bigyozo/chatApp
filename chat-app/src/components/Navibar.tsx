'use client'
import { ChatModel } from "@/common/type";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { useAuth } from "react-oidc-context";

const Navibar: React.FC = () => {

  const router = useRouter();
  const auth = useAuth();

  const { data: chats } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      return axios.get(`/api/chats?userId=${auth.user?.profile.sub}`).then(res => res.data);
    }
  });

  const pathname = usePathname();

  const handleLogout = async () => {
    await auth.removeUser();
    router.push('/');
  };

  return (
    <div className="h-full bg-gray-150 flex flex-col">
      <div className="h-10 flex items-center justify-center mt-8 cursor-pointer hover:bg-gray-200"
        onClick={() => {
          router.push('/');
        }}>
        <p className="h-full w-2/3 bg-blue-100 rounded-lg flex items-center justify-center font-thin">
          新しいチャット
        </p>
      </div>

      <div className="flex flex-col items-center justify-start mt-4 gap-2 p-6 flex-1 overflow-y-auto">
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

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-400 text-center mb-2 truncate">{auth.user?.profile.email}</div>
        <button
          className="w-full py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          onClick={handleLogout}
        >
          ログアウト
        </button>
      </div>
    </div>
  );
};

export default Navibar;
