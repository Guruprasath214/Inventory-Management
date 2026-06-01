import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
    getGetInventoryStatsQueryKey,
    getGetProductQueryKey,
    getListNotificationsQueryKey,
    getListProductsQueryKey,
    useCreateProduct,
    useDeleteProduct,
    useGetProduct,
    useUpdateProduct,
    useUpdateStock
} from "@workspace/api-client-react";
import { ArrowLeft, Box, Info, Save, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useParams } from "wouter";
import { z } from "zod";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "Product-code is required"),
  description: z.string().nullable().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be >= 0"),
  quantity: z.coerce.number().min(0, "Quantity must be >= 0"),
  lowStockThreshold: z.coerce.number().min(0, "Threshold must be >= 0").optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductForm() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEdit = !!id && id !== "new";
  const productId = isEdit ? parseInt(id, 10) : 0;

  const { data: product, isLoading: isProductLoading } = useGetProduct(productId, {
    query: {
      enabled: isEdit,
      queryKey: getGetProductQueryKey(productId)
    }
  });

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const stockMutation = useUpdateStock();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      category: "",
      price: 0,
      quantity: 0,
      lowStockThreshold: 10,
    }
  });

  // Init form data when editing
  useEffect(() => {
    if (isEdit && product) {
      form.reset({
        name: product.name,
        sku: product.sku,
        description: product.description || "",
        category: product.category,
        price: product.price,
        quantity: product.quantity,
        lowStockThreshold: product.lowStockThreshold,
      });
    }
  }, [isEdit, product, form]);

  const onSubmit = (data: ProductFormValues) => {
    if (isEdit) {
      updateMutation.mutate({
        id: productId,
        data: {
          name: data.name,
          sku: data.sku,
          description: data.description,
          category: data.category,
          price: data.price,
          lowStockThreshold: data.lowStockThreshold
        }
      }, {
        onSuccess: () => {
          toast({ title: "Product updated", description: "The product details have been saved." });
          queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetInventoryStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
          
          // If quantity changed on edit, we need a separate stock update
          if (product && data.quantity !== product.quantity) {
            stockMutation.mutate({
              id: productId,
              data: { quantity: data.quantity }
            }, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
                queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
                queryClient.invalidateQueries({ queryKey: getGetInventoryStatsQueryKey() });
                  queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
              }
            });
          }
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    } else {
      createMutation.mutate({
        data
      }, {
        onSuccess: (newProduct) => {
          toast({ title: "Product created", description: "The new product has been added to inventory." });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetInventoryStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
          setLocation(`/products/${newProduct.id}`);
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    }
  };

  const handleDelete = () => {
    if (!isEdit) return;
    deleteMutation.mutate({ id: productId }, {
      onSuccess: () => {
        toast({ title: "Product deleted", description: "The product has been removed from inventory." });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInventoryStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        setLocation("/products");
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending || stockMutation.isPending;

  if (isEdit && isProductLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[500px] lg:col-span-2" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/products")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{isEdit ? "Edit Product" : "New Product"}</h1>
            {isEdit && product && <p className="text-muted-foreground font-mono text-sm mt-1">ID: {product.id} • Last updated: {new Date(product.updatedAt).toLocaleString()}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{product?.name}" and remove its data from our servers. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleteMutation.isPending ? "Deleting..." : "Delete Product"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
            <Save className="w-4 h-4 mr-2" />
            {isPending ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-lg"><Info className="w-4 h-4 text-primary"/> Product Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Ergonomic Office Chair" className="bg-background/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product-code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. FUR-CHR-001" className="font-mono bg-background/50 uppercase" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Furniture" className="bg-background/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (INR)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-muted-foreground font-mono">₹</span>
                              <Input type="number" step="0.01" min="0" placeholder="0.00" className="pl-7 font-mono bg-background/50" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Product details..." className="min-h-[120px] bg-background/50 resize-none" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg"><Box className="w-4 h-4 text-primary"/> Inventory Controls</CardTitle>
              {isEdit && product && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Current Status</span>
                  {product.quantity === 0 ? (
                    <Badge variant="destructive">Out of Stock</Badge>
                  ) : product.isLowStock ? (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">Low Stock</Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">Healthy</Badge>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form className="space-y-6">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Stock Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" className="text-xl font-mono h-12 bg-background/50" {...field} />
                        </FormControl>
                        <FormDescription>
                          {isEdit ? "Update to record new stock intake or manual adjustment." : "Initial stock amount"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lowStockThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Low Stock Threshold</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" className="bg-background/50 font-mono" {...field} />
                        </FormControl>
                        <FormDescription>
                          Trigger alerts when stock falls below this number.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}