"use client";

import { AuthProvider } from "react-oidc-context";
import QueryClientProvider from "./QueryClientProvider";
import AuthGuard from "./AuthGuard";

const cognitoAuthConfig = {
  authority: process.env.NEXT_PUBLIC_COGNITO_AUTHORITY!,
  client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
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
