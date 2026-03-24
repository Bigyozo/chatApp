"use client";

import { AuthProvider } from "react-oidc-context";
import QueryClientProvider from "./QueryClientProvider";
import AuthGuard from "./AuthGuard";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_Awe67tW4x",
  client_id: "1e52kb2ro0l5a8n6magqipfh58",
  redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URL,
  response_type: "code",
  scope: "phone openid email",
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider {...cognitoAuthConfig} onSigninCallback={() => {
      window.history.replaceState({}, document.title, window.location.pathname);
    }}>
      <QueryClientProvider>
        <AuthGuard>
          {children}
        </AuthGuard>
      </QueryClientProvider>
    </AuthProvider>
  );
}
