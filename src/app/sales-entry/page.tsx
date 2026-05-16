
"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { db, Product, Sale, Customer } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, History, Search, Check, RotateCcw, User, Plus, Trash2, Tag } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTranslation } from "@/context/language-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export default function SalesEntryPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  
  // Selection states
  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash')
  const [quantity, setQuantity] = useState("1")
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [totalDiscount, setTotalDiscount] = useState("0")
  
  // Search states
  const [productSearch, setProductSearch] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false)
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false)

  const loadData = useCallback(() => {
    const allProducts = db.getProducts();
    setProducts(allProducts.filter(p => p.quantity > 0))
    setCustomers(db.getCustomers())
    setRecentSales(db.getSales().slice(0, 10))
  }, [])

  useEffect(() => {
    loadData()
    const handleSync = () => loadData();
    window.addEventListener('salesphere-db-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('salesphere-db-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadData])

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    )
  }, [products, productSearch])

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
    )
  }, [customers, customerSearch])

  const selectedProduct = products.find(p => p.id === selectedProductId)
  
  const addToCart = () => {
    if (!selectedProductId || !selectedProduct) {
      toast({ title: t.error, description: "Please select a product.", variant: "destructive" })
      return
    }

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) {
      toast({ title: t.error, description: "Enter a valid quantity.", variant: "destructive" })
      return
    }

    if (qty > selectedProduct.quantity) {
      toast({ title: t.error, description: t.insufficientStock, variant: "destructive" })
      return
    }

    const price = Number(selectedProduct.sellingPrice) || Number(selectedProduct.price) || 0;
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: qty,
      price: price,
      total: price * qty
    }

    setCart([...cart, newItem])
    setSelectedProductId("")
    setQuantity("1")
    setProductSearch("")
    toast({ title: t.success, description: "Added to cart" })
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const finalTotal = Math.max(0, subtotal - (parseFloat(totalDiscount) || 0))

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast({ title: t.error, description: t.cartEmpty, variant: "destructive" })
      return
    }

    if (paymentType === 'credit' && !selectedCustomerId) {
      toast({ title: t.error, description: "Please select a customer for credit sales.", variant: "destructive" })
      return
    }

    try {
      // Process each item in cart
      // We divide the total discount proportionally among items to maintain correct profit calculation
      const discountPerItem = (parseFloat(totalDiscount) || 0) / cart.length;

      cart.forEach(item => {
        db.recordSale(
          item.productId, 
          item.quantity, 
          paymentType, 
          selectedCustomerId || undefined, 
          discountPerItem
        )
      })

      toast({ title: t.saleRecorded, description: "Transaction completed successfully." })
      setCart([])
      setTotalDiscount("0")
      setSelectedCustomerId("")
      setPaymentType('cash')
      loadData()
    } catch (err: any) {
      toast({ title: t.saleFailed, description: err.message, variant: "destructive" })
    }
  }

  const handleReturn = (saleId: string) => {
    if (confirm(t.confirmReturn)) {
      db.returnSale(saleId)
      toast({ title: t.success, description: t.saleReturned })
      loadData()
    }
  }

  return (
    <div className="p-8 grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Left Column: Selection & Cart */}
      <div className="xl:col-span-8 space-y-8">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">{t.salesEntry}</h1>
          <p className="text-muted-foreground">{t.welcome}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Selection Card */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                {t.selectProduct}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Popover open={isProductPopoverOpen} onOpenChange={setIsProductPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-12">
                      {selectedProductId ? products.find(p => p.id === selectedProductId)?.name : t.searchProducts}
                      <Search className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 opacity-50" />
                      <Input
                        placeholder={t.searchProducts}
                        className="border-none focus-visible:ring-0 shadow-none px-0"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-72">
                      {filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">{t.noData}</div>
                      ) : (
                        <div className="p-1">
                          {filteredProducts.map((p) => (
                            <div
                              key={p.id}
                              className={cn(
                                "flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm hover:bg-accent",
                                selectedProductId === p.id && "bg-accent"
                              )}
                              onClick={() => {
                                setSelectedProductId(p.id)
                                setIsProductPopoverOpen(false)
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedProductId === p.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span className="font-medium">{p.name}</span>
                                <span className="text-xs text-muted-foreground">${(p.sellingPrice || p.price || 0).toFixed(2)} - {p.quantity} {t.units}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t.quantity}</Label>
                  <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" className="h-12" />
                </div>
                <div className="flex items-end">
                  <Button onClick={addToCart} className="w-full h-12 bg-primary">
                    <Plus className="mr-2 h-4 w-4" /> {t.addToCart}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Payment Card */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {t.customer}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-12">
                      {selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : t.searchCustomers}
                      <Search className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 opacity-50" />
                      <Input
                        placeholder={t.searchCustomers}
                        className="border-none focus-visible:ring-0 shadow-none px-0"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-72">
                      <div className="p-2 text-xs font-bold text-muted-foreground bg-muted/30 cursor-pointer hover:bg-muted" onClick={() => { setSelectedCustomerId(""); setIsCustomerPopoverOpen(false); }}>-- {t.cash} --</div>
                      {filteredCustomers.map((c) => (
                        <div
                          key={c.id}
                          className={cn("flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm hover:bg-accent", selectedCustomerId === c.id && "bg-accent")}
                          onClick={() => { setSelectedCustomerId(c.id); setIsCustomerPopoverOpen(false); }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedCustomerId === c.id ? "opacity-100" : "opacity-0")} />
                          <div className="flex flex-col">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-xs text-muted-foreground">{c.phone}</span>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <RadioGroup defaultValue="cash" value={paymentType} onValueChange={(val) => setPaymentType(val as any)} className="flex gap-4 p-2 bg-muted rounded-md h-12 items-center">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="cursor-pointer">{t.cash}</Label>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="credit" id="credit" />
                    <Label htmlFor="credit" className="cursor-pointer">{t.credit}</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Card */}
        <Card className="border-none shadow-xl bg-card overflow-hidden">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2 text-primary">
              <ShoppingCart className="h-5 w-5" />
              {t.cart} ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{t.product}</TableHead>
                    <TableHead>{t.price}</TableHead>
                    <TableHead>{t.qty}</TableHead>
                    <TableHead>{t.totalPrice}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.length > 0 ? (
                    cart.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>${item.price.toFixed(2)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="font-bold text-primary">${item.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                        {t.cartEmpty}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Checkout Summary & History */}
      <div className="xl:col-span-4 space-y-8">
        <Card className="border-none shadow-2xl bg-primary text-primary-foreground sticky top-8">
          <CardHeader>
            <CardTitle>{t.completeSale}</CardTitle>
            <CardDescription className="text-primary-foreground/70">Summary of the transaction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{t.subtotal}:</span>
                <span className="font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="grid gap-2 pt-2">
                <Label htmlFor="totalDiscount" className="text-primary-foreground/80 flex items-center gap-2">
                  <Tag className="h-3 w-3" /> {t.discount}
                </Label>
                <Input 
                  id="totalDiscount" 
                  type="number" 
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-10" 
                  value={totalDiscount} 
                  onChange={(e) => setTotalDiscount(e.target.value)}
                />
              </div>
              <div className="border-t border-white/20 pt-4 flex justify-between items-center">
                <span className="text-lg font-bold">{t.finalTotal}:</span>
                <span className="text-3xl font-black">${finalTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <Button 
              className="w-full bg-accent hover:bg-accent/90 text-primary font-black py-8 text-xl shadow-lg" 
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
            >
              {t.completeSale}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Sales History Snippet */}
        <div className="space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <History className="h-4 w-4" />
            {t.recentSales}
          </h3>
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableBody>
                {recentSales.map(sale => (
                  <TableRow key={sale.id} className="text-xs">
                    <TableCell className="py-2">
                      <div className="font-bold">{sale.productName}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </TableCell>
                    <TableCell className="py-2 font-bold text-primary">${sale.totalPrice.toFixed(2)}</TableCell>
                    <TableCell className="py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReturn(sale.id)}>
                        <RotateCcw className="h-3 w-3 text-orange-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
