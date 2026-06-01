import { type QueryKey } from "@tanstack/react-query";
type ListProductsParams = {
    lowStock?: boolean;
    category?: string;
    search?: string;
};
type MutationOptions = {
    onSuccess?: (...args: any[]) => void;
    onError?: (...args: any[]) => void;
};
type QueryOptions = {
    enabled?: boolean;
    queryKey?: QueryKey;
};
export declare function getListProductsQueryKey(params?: ListProductsParams): readonly ["listProducts", Record<string, string | boolean>] | readonly ["listProducts"];
export declare function getGetInventoryStatsQueryKey(): readonly ["getInventoryStats"];
export declare function getGetProductQueryKey(id: number): readonly ["getProduct", number];
export declare function useListProducts(params?: ListProductsParams, options?: {
    query?: QueryOptions;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<{
    id: number;
    name: string;
    sku: string;
    category: string;
    price: number;
    quantity: number;
    lowStockThreshold: number;
    isLowStock: boolean;
    createdAt: string;
    updatedAt: string;
    description?: string | null | undefined;
}[]>, Error>;
export declare function useGetInventoryStats(options?: {
    query?: QueryOptions;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<{
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    categories: {
        category: string;
        count: number;
        totalValue: number;
    }[];
}>, Error>;
export declare function useGetProduct(id: number, options?: {
    query?: QueryOptions;
}): import("@tanstack/react-query").UseQueryResult<NoInfer<{
    id: number;
    name: string;
    sku: string;
    category: string;
    price: number;
    quantity: number;
    lowStockThreshold: number;
    isLowStock: boolean;
    createdAt: string;
    updatedAt: string;
    description?: string | null | undefined;
}>, Error>;
export declare function useCreateProduct(options?: MutationOptions): import("@tanstack/react-query").UseMutationResult<any, any, any, any>;
export declare function useUpdateProduct(options?: MutationOptions): import("@tanstack/react-query").UseMutationResult<any, any, any, any>;
export declare function useDeleteProduct(options?: MutationOptions): import("@tanstack/react-query").UseMutationResult<any, any, any, any>;
export declare function useUpdateStock(options?: MutationOptions): import("@tanstack/react-query").UseMutationResult<any, any, any, any>;
export type { Product } from "./generated/api.schemas";
