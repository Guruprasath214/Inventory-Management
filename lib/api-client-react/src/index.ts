import { useMutation, useQuery, type QueryKey } from "@tanstack/react-query";
import type {
    InventoryStats,
    Notification,
    NotificationReadAck,
    Product,
} from "../../api-zod/src/index";

type ListProductsParams = {
  lowStock?: boolean;
  category?: string;
  search?: string;
};

type ListNotificationsParams = {
  unreadOnly?: boolean;
  limit?: number;
};

type CreateProductInput = {
  name: string;
  sku: string;
  description?: string | null;
  category: string;
  price: number;
  quantity: number;
  lowStockThreshold?: number;
};

type UpdateProductInput = {
  name?: string;
  sku?: string;
  description?: string | null;
  category?: string;
  price?: number;
  lowStockThreshold?: number;
};

type UpdateStockInput = {
  quantity: number;
};

type MutationOptions = {
  onSuccess?: (...args: any[]) => void;
  onError?: (...args: any[]) => void;
};

type QueryOptions = {
  enabled?: boolean;
  queryKey?: QueryKey;
};

type RuntimeLocation = {
  hostname: string;
  port: string;
  protocol: string;
};

const runtimeLocation = (globalThis as { location?: RuntimeLocation }).location;

const apiBase =
  runtimeLocation &&
  (runtimeLocation.hostname === "localhost" || runtimeLocation.hostname === "127.0.0.1")
    ? `${runtimeLocation.protocol}//${runtimeLocation.hostname}:5000/api`
    : "/api";

function normalizeParams(params: ListProductsParams = {}) {
  const normalized: Record<string, string | boolean> = {};

  if (params.lowStock !== undefined) {
    normalized.lowStock = params.lowStock;
  }

  if (params.category) {
    normalized.category = params.category;
  }

  if (params.search) {
    normalized.search = params.search;
  }

  return normalized;
}

function buildQueryString(params: Record<string, string | boolean>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    query.set(key, String(value));
  }

  const stringified = query.toString();
  return stringified ? `?${stringified}` : "";
}

function buildFlexibleQueryString(params: Record<string, string | boolean | number>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    query.set(key, String(value));
  }

  const stringified = query.toString();
  return stringified ? `?${stringified}` : "";
}

async function readErrorMessage(response: Response) {
  const body = await response.text();

  if (!body) {
    return `Request failed with status ${response.status}`;
  }

  try {
    const data = JSON.parse(body);

    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch {
    return body;
  }

  return body;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function buildProductPath(id: number) {
  return `/products/${id}`;
}

export function getListProductsQueryKey(params?: ListProductsParams) {
  const normalized = normalizeParams(params);
  return Object.keys(normalized).length > 0
    ? (["listProducts", normalized] as const)
    : (["listProducts"] as const);
}

export function getGetInventoryStatsQueryKey() {
  return ["getInventoryStats"] as const;
}

export function getGetProductQueryKey(id: number) {
  return ["getProduct", id] as const;
}

export function getListNotificationsQueryKey(params?: ListNotificationsParams) {
  const normalized: Record<string, string | boolean | number> = {};

  if (params?.unreadOnly !== undefined) {
    normalized.unreadOnly = params.unreadOnly;
  }

  if (params?.limit !== undefined) {
    normalized.limit = params.limit;
  }

  return Object.keys(normalized).length > 0
    ? (["listNotifications", normalized] as const)
    : (["listNotifications"] as const);
}

export function useListProducts(
  params: ListProductsParams = {},
  options?: { query?: QueryOptions },
) {
  return useQuery({
    queryKey: getListProductsQueryKey(params),
    queryFn: async ({ signal }) =>
      requestJson<Product[]>(
        `/products${buildQueryString(normalizeParams(params))}`,
        { signal },
      ),
    ...(options?.query ?? {}),
  });
}

export function useGetInventoryStats(options?: { query?: QueryOptions }) {
  return useQuery({
    queryKey: getGetInventoryStatsQueryKey(),
    queryFn: async ({ signal }) =>
      requestJson<InventoryStats>("/products/stats", { signal }),
    ...(options?.query ?? {}),
  });
}

export function useGetProduct(id: number, options?: { query?: QueryOptions }) {
  return useQuery({
    queryKey: getGetProductQueryKey(id),
    queryFn: async ({ signal }) =>
      requestJson<Product>(buildProductPath(id), { signal }),
    enabled: options?.query?.enabled ?? true,
    ...(options?.query ?? {}),
  });
}

export function useListNotifications(
  params: ListNotificationsParams = {},
  options?: { query?: QueryOptions },
) {
  const normalized: Record<string, string | boolean | number> = {};

  if (params.unreadOnly !== undefined) {
    normalized.unreadOnly = params.unreadOnly;
  }

  if (params.limit !== undefined) {
    normalized.limit = params.limit;
  }

  return useQuery({
    queryKey: getListNotificationsQueryKey(params),
    queryFn: async ({ signal }) =>
      requestJson<Notification[]>(
        `/notifications${buildFlexibleQueryString(normalized)}`,
        { signal },
      ),
    ...(options?.query ?? {}),
  });
}

export function useCreateProduct(options?: MutationOptions) {
  return useMutation({
    mutationFn: async ({ data }: { data: CreateProductInput }) =>
      requestJson<Product>("/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...(options ?? {}),
  });
}

export function useUpdateProduct(options?: MutationOptions) {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateProductInput;
    }) =>
      requestJson<Product>(buildProductPath(id), {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    ...(options ?? {}),
  });
}

export function useDeleteProduct(options?: MutationOptions) {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) =>
      requestJson<void>(buildProductPath(id), {
        method: "DELETE",
      }),
    ...(options ?? {}),
  });
}

export function useUpdateStock(options?: MutationOptions) {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateStockInput;
    }) =>
      requestJson<Product>(`${buildProductPath(id)}/stock`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    ...(options ?? {}),
  });
}

export function useMarkNotificationsRead(options?: MutationOptions) {
  return useMutation({
    mutationFn: async ({ data }: { data: { notificationIds: number[] } }) =>
      requestJson<NotificationReadAck>("/notifications/read", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...(options ?? {}),
  });
}

export function useMarkAllNotificationsRead(options?: MutationOptions) {
  return useMutation({
    mutationFn: async () =>
      requestJson<NotificationReadAck>("/notifications/read-all", {
        method: "POST",
      }),
    ...(options ?? {}),
  });
}

export type { Notification, NotificationReadAck, Product } from "../../api-zod/src/index";
