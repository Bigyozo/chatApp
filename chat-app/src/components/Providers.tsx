"use client";

import { AuthProvider } from "react-oidc-context";
import QueryClientProvider from "./QueryClientProvider";
import AuthGuard from "./AuthGuard";
import { useEffect, useState } from "react";

interface CognitoConfig {
  authority: string;
  clientId: string;
  redirectUrl: string;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<CognitoConfig | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(console.error);
  }, []);

  if (!config) return null;

  const cognitoAuthConfig = {
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUrl,
    response_type: "code",
    scope: "phone openid email",
  };

  return (
    <AuthProvider
      {...cognitoAuthConfig}
      onSigninCallback={() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }}
    >
      <QueryClientProvider>
        <AuthGuard>{children}</AuthGuard>
      </QueryClientProvider>
    </AuthProvider>
  );
}
