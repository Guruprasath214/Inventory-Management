import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetInventoryStatsQueryKey, getGetProductQueryKey, getListNotificationsQueryKey, getListProductsQueryKey, useUpdateStock } from "@workspace/api-client-react";
import { useState } from "react";

interface UpdateStockDialogProps {
  product: { id: number; name: string; quantity: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateStockDialog({ product, open, onOpenChange }: UpdateStockDialogProps) {
  const [quantity, setQuantity] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateStock = useUpdateStock();

  // Reset local state when dialog opens
  if (open && product && quantity === "") {
    setQuantity(product.quantity.toString());
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    
    const newQuantity = parseInt(quantity, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be 0 or greater.", variant: "destructive" });
      return;
    }

    updateStock.mutate({
      id: product.id,
      data: { quantity: newQuantity }
    }, {
      onSuccess: () => {
        toast({ title: "Stock updated", description: `Updated stock for ${product.name}.` });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInventoryStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(product.id) });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        onOpenChange(false);
        setQuantity("");
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message || "Failed to update stock", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setQuantity("");
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Stock</DialogTitle>
          <DialogDescription>
            Current quantity for {product?.name}: <strong className="text-foreground">{product?.quantity}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">New Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateStock.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateStock.isPending}>
              {updateStock.isPending ? "Updating..." : "Update Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}