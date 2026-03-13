import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { GameAlertProvider } from "@/components/GameAlert";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 全局 30 秒 staleTime，减少重复请求，避免触发 429
      staleTime: 30_000,
      // 429 Too Many Requests 不自动重试，避免加剧限流
      retry: (failureCount, error) => {
        const httpStatus = (error as any)?.data?.httpStatus;
        if (httpStatus === 429) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// OAuth auto-redirect disabled: this app uses its own phone-based auth system
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[API Query Error]", event.query.state.error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[API Mutation Error]", event.mutation.state.error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <GameAlertProvider>
        <App />
      </GameAlertProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
