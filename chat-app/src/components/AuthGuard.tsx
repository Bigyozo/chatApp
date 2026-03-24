"use client";

import { useAuth } from "react-oidc-context";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <p className="text-lg text-gray-500">Loading...</p>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-red-500">認証エラー: {auth.error.message}</p>
        <button
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          onClick={() => auth.signinRedirect()}
        >
          再ログイン
        </button>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">チャットボット</h1>
        <p className="text-gray-500">ログインして会話を始めましょう</p>
        <button
          className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-lg"
          onClick={() => auth.signinRedirect()}
        >
          ログイン
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
