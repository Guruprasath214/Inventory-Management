import { Link } from "wouter";
import { Package, TrendingUp, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import { useGetInventoryStats, useListProducts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductsTable } from "@/components/products-table";
import { formatCurrency, formatNumber } from "@/lib/format";
import React from "react";

function StatCard({ title, value, icon: Icon, description, colorClass }: any) {
  return (
    <Card className="relative overflow-hidden border-border/50">
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full opacity-5 ${colorClass}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-md ${colorClass.replace('bg-', 'bg-').replace('-500', '-500/10')} ${colorClass.replace('bg-', 'text-')}`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight font-mono">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, refetch } = useGetInventoryStats();
  const { data: products, isLoading: productsLoading } = useListProducts({ lowStock: true });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Operations Center</h1>
          <p className="text-muted-foreground mt-1">Real-time inventory overview and critical alerts.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
          <Button asChild>
            <Link href="/products/new">Add Product</Link>
          </Button>
        </div>
      </div>

      {statsLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-[100px]" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-[120px] mt-2" /></CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Products"
            value={formatNumber(stats.totalProducts)}
            icon={Package}
            colorClass="bg-primary text-primary"
            description="Active SKUs in catalog"
          />
          <StatCard
            title="Inventory Value"
            value={formatCurrency(stats.totalValue)}
            icon={TrendingUp}
            colorClass="bg-emerald-500 text-emerald-500"
            description="Total capital locked in stock"
          />
          <StatCard
            title="Low Stock Alerts"
            value={formatNumber(stats.lowStockCount)}
            icon={AlertTriangle}
            colorClass="bg-amber-500 text-amber-500"
            description="Products below threshold"
          />
          <StatCard
            title="Out of Stock"
            value={formatNumber(stats.outOfStockCount)}
            icon={AlertCircle}
            colorClass="bg-destructive text-destructive"
            description="Immediate action required"
          />
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-12 items-start">
        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Requires Attention
            </h2>
            <Link href="/products" className="text-sm text-primary hover:underline font-medium">
              View All Products →
            </Link>
          </div>
          
          {productsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <ProductsTable products={products?.slice(0, 10) || []} />
          )}
        </div>

        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Categories</h2>
          <Card className="border-border/50">
            <CardContent className="p-0">
              {statsLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : stats?.categories.length ? (
                <div className="divide-y divide-border/50">
                  {stats.categories.map((cat) => (
                    <div key={cat.category} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="font-medium text-sm">{cat.category}</div>
                        <div className="text-xs text-muted-foreground">{formatNumber(cat.count)} items</div>
                      </div>
                      <div className="text-sm font-mono font-medium text-right">
                        {formatCurrency(cat.totalValue)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}