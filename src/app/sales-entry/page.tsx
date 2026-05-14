
"use client"

import { useEffect, useState } from "react"
import { db, Product, Sale, getSafeSaleProfit } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, CheckCircle2, History } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function SalesEntryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState("1")
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    const allProducts = db.getProducts();
    setProducts(allProducts.filter(p => p.quantity > 0))
    setRecentSales(db.getSales().slice(0, 10))
  }

  const handleSale = () => {
    if (!selectedProductId || !quantity) {
      toast({ title: "Error", description: "Select a product and quantity.", variant: "destructive" })
      return
    }

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Error", description: "Enter a valid quantity.", variant: "destructive" })
      return
    }

    try {
      db.recordSale(selectedProductId, qty)
      toast({ title: "Sale Recorded", description: "Stock and profits updated." })
      loadData()
      setSelectedProductId("")
      setQuantity("1")
    } catch (err: any) {
      toast({ title: "Sale Failed", description: err.message, variant: "destructive" })
    }
  }

  const selectedProduct = products.find(p => p.id === selectedProductId)
  const displayPrice = selectedProduct ? (selectedProduct.sellingPrice || selectedProduct.price || 0) : 0;

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Sale Entry</h1>
          <p className="text-muted-foreground">Record a new transaction quickly.</p>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-accent" />
              New Transaction
            </CardTitle>
            <CardDescription>Fill in the details to complete a sale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label>Select Product</Label>
              <Select onValueChange={setSelectedProductId} value={selectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Search products..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => {
                    const price = p.sellingPrice || p.price || 0;
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - ${price.toFixed(2)} ({p.quantity} available)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="qty">Quantity Sold</Label>
                <Input 
                  id="qty" 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  min="1"
                />
              </div>
              <div className="grid gap-2">
                <Label>Total Price</Label>
                <div className="h-10 px-3 py-2 rounded-md bg-muted flex items-center font-bold text-primary">
                  ${(displayPrice * (parseInt(quantity) || 0)).toFixed(2)}
                </div>
              </div>
            </div>

            <Button className="w-full bg-accent hover:bg-accent/90 text-primary font-bold py-6" onClick={handleSale}>
              Complete Sale
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-headline font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Recent Sales
          </h2>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map(sale => {
                  // جلب قائمة المنتجات لحساب الربح للعمليات القديمة إذا لزم الأمر
                  const allProducts = db.getProducts();
                  const calculatedProfit = getSafeSaleProfit(sale, allProducts);
                  
                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.productName}</TableCell>
                      <TableCell>{sale.quantitySold}</TableCell>
                      <TableCell>${sale.totalPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-green-600 dark:text-green-400 font-semibold">
                        +${calculatedProfit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(sale.timestamp).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {recentSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No recent sales.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-lg">Financial Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm opacity-90 space-y-2">
            <p>• Profit is calculated as: (Selling Price - Purchase Price) × Quantity.</p>
            <p>• Stock levels update immediately after every sale.</p>
            <p>• Ensure your purchase prices are accurate for better reporting.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
