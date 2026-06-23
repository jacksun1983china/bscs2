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
      // 不自动重试 429/400 等不可恢复错误
      retry: (failureCount, error) => {
        const errMsg = (error as any)?.message ?? '';
        const httpStatus = (error as any)?.data?.httpStatus;
        // 429 Rate exceeded（可能是纯文本响应导致 JSON 解析失败）
        if (httpStatus === 429) return false;
        if (errMsg.includes('Rate exceeded')) return false;
        if (errMsg.includes('429')) return false;
        if (errMsg.includes('Too Many Requests')) return false;
        // Zod 验证错误（如 limit 超限）不重试
        if (httpStatus === 400) return false;
        if (errMsg.includes('Too big')) return false;
        // 其他错误最多重试 1 次
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // mutation 默认不重试
      retry: false,
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
        const headers = new Headers((init as any)?.headers);
        // 管理后台优先依赖 cookie；本地 token 仅作可选兜底，移动端存储异常时也不能阻断请求
        let adminToken: string | null = null;
        try {
          adminToken = globalThis.localStorage?.getItem('bdcs2_admin_token') ?? null;
        } catch {
          adminToken = null;
        }
        if (adminToken) {
          headers.set('Authorization', `Bearer ${adminToken}`);
        }
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
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
