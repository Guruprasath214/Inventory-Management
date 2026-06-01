import { useState } from "react";
import { Search } from "lucide-react";
import { useListProducts, useGetInventoryStats } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductsTable } from "@/components/products-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("_all");
  const [lowStock, setLowStock] = useState(false);

  const { data: stats } = useGetInventoryStats();
  const { data: products, isLoading } = useListProducts({
    search: search || undefined,
    category: category !== "_all" ? category : undefined,
    lowStock: lowStock || undefined
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Products Directory</h1>
          <p className="text-muted-foreground mt-1">Manage catalog and monitor stock levels.</p>
        </div>
      </div>

      <div className="p-4 border border-border/50 bg-card rounded-md shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 md:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or Product-code..."
                className="pl-9 bg-background/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="w-full md:w-[240px] space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Categories</SelectItem>
                {stats?.categories.map((c) => (
                  <SelectItem key={c.category} value={c.category}>{c.category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pb-2 h-10 px-2">
            <Switch id="low-stock" checked={lowStock} onCheckedChange={setLowStock} />
            <Label htmlFor="low-stock" className="cursor-pointer text-sm font-medium">Low Stock Only</Label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <ProductsTable products={products || []} />
      )}
    </div>
  );
}