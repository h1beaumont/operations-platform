import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Overload signatures
export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<Response>;
export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<Response>;

// Implementation
export async function apiRequest(
  urlOrMethod: string,
  urlOrOptions?: string | {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  },
  body?: any,
  headers?: Record<string, string>
): Promise<Response> {
  // Determine which overload was called
  let method: string;
  let url: string;
  let requestBody: string | undefined;
  let customHeaders: Record<string, string>;

  if (typeof urlOrOptions === "string") {
    // First overload: apiRequest(method, url, body, headers)
    method = urlOrMethod;
    url = urlOrOptions;
    requestBody = body ? JSON.stringify(body) : undefined;
    customHeaders = headers || {};
  } else {
    // Second overload: apiRequest(url, options)
    url = urlOrMethod;
    const options = urlOrOptions || {};
    method = options.method || "GET";
    requestBody = options.body;
    customHeaders = options.headers || {};
  }
  
  const res = await fetch(url, {
    method,
    headers: {
      ...customHeaders,
      ...(requestBody && !customHeaders["Content-Type"] ? { "Content-Type": "application/json" } : {}),
    },
    body: requestBody,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
