import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@workspace/api-client-react/src/generated/api.schemas";
import { AlertCircle, AlertTriangle, PackageOpen, PackagePlus, Pencil } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { UpdateStockDialog } from "./update-stock-dialog";

interface ProductsTableProps {
  products: Product[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [stockUpdateProduct, setStockUpdateProduct] = useState<{id: number, name: string, quantity: number} | null>(null);

  if (products.length === 0) {
    return (
      <div className="border border-border rounded-md py-12 flex flex-col items-center justify-center bg-card text-card-foreground">
        <PackageOpen className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No products found</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center mb-6">
          We couldn't find any products matching your criteria. Try adjusting your filters or add a new product.
        </p>
        <Link href="/products/new">
          <Button>Add Product</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="border border-border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Product Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/products/${product.id}`} className="hover:underline underline-offset-4 decoration-primary text-foreground">
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal text-xs">{product.category}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(product.price)}</TableCell>
                <TableCell className="text-right font-mono font-medium">{product.quantity}</TableCell>
                <TableCell className="text-right">
                  {product.quantity === 0 ? (
                    <Badge variant="destructive" className="ml-auto inline-flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" />
                      Out of Stock
                    </Badge>
                  ) : product.isLowStock ? (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 ml-auto inline-flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      Low Stock ({product.quantity} left)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 ml-auto">
                      Healthy
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setStockUpdateProduct({ id: product.id, name: product.name, quantity: product.quantity })}
                      title="Update Stock"
                    >
                      <PackagePlus className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                    </Button>
                    <Link href={`/products/${product.id}`}>
                      <Button variant="ghost" size="icon" title="Edit Product" asChild>
                        <span>
                          <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </span>
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UpdateStockDialog 
        product={stockUpdateProduct} 
        open={!!stockUpdateProduct} 
        onOpenChange={(open) => !open && setStockUpdateProduct(null)} 
      />
    </>
  );
}