import { z } from "zod/v4";
export declare const HealthCheckResponse: z.ZodObject<{
    status: z.ZodString;
}, z.core.$strip>;
export declare const ProductSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    sku: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodString;
    price: z.ZodNumber;
    quantity: z.ZodNumber;
    lowStockThreshold: z.ZodNumber;
    isLowStock: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type Product = z.infer<typeof ProductSchema>;
export declare const CategoryStatSchema: z.ZodObject<{
    category: z.ZodString;
    count: z.ZodNumber;
    totalValue: z.ZodNumber;
}, z.core.$strip>;
export type CategoryStat = z.infer<typeof CategoryStatSchema>;
export declare const InventoryStatsSchema: z.ZodObject<{
    totalProducts: z.ZodNumber;
    totalValue: z.ZodNumber;
    lowStockCount: z.ZodNumber;
    outOfStockCount: z.ZodNumber;
    categories: z.ZodArray<z.ZodObject<{
        category: z.ZodString;
        count: z.ZodNumber;
        totalValue: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type InventoryStats = z.infer<typeof InventoryStatsSchema>;
export declare const ProductInputSchema: z.ZodObject<{
    name: z.ZodString;
    sku: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodString;
    price: z.ZodNumber;
    quantity: z.ZodNumber;
    lowStockThreshold: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const ProductUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    sku: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodNumber>;
    lowStockThreshold: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const StockUpdateSchema: z.ZodObject<{
    quantity: z.ZodNumber;
}, z.core.$strip>;
export declare const ListProductsQueryParams: z.ZodObject<{
    lowStock: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    category: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const CreateProductBody: z.ZodObject<{
    name: z.ZodString;
    sku: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodString;
    price: z.ZodNumber;
    quantity: z.ZodNumber;
    lowStockThreshold: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const UpdateProductBody: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    sku: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodNumber>;
    lowStockThreshold: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const UpdateStockBody: z.ZodObject<{
    quantity: z.ZodNumber;
}, z.core.$strip>;
export declare const GetProductParams: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
export declare const UpdateProductParams: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
export declare const DeleteProductParams: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
export declare const UpdateStockParams: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
export declare const ErrorResponse: z.ZodObject<{
    error: z.ZodString;
}, z.core.$strip>;
