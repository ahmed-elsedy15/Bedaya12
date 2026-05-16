
"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { db, Product, Sale, Customer } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, History, Search, Check, RotateCcw, User, Plus, Trash2, Tag, CreditCard, Wallet, ArrowRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTranslation } from "@/context/language-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

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
    <div className="p-4 md:p-8 grid grid-cols-1 xl:grid-cols-12 gap-8 bg-slate-50/50 dark:bg-transparent min-h-screen">
      {/* Left Column: Selection & Cart */}
      <div className="xl:col-span-8 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
              <ShoppingCart className="h-8 w-8" />
              {t.salesEntry}
            </h1>
            <p className="text-muted-foreground mt-1">{t.welcome}</p>
          </div>
          <Badge variant="outline" className="px-3 py-1 text-sm bg-white dark:bg-slate-900 shadow-sm border-primary/20">
            {t.totalItems}: {cart.length}
          </Badge>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Selection Card */}
          <Card className="border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
            <div className="h-1 bg-primary w-full" />
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Plus className="h-4 w-4" />
                </div>
                {t.selectProduct}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.productName}</Label>
                <Popover open={isProductPopoverOpen} onOpenChange={setIsProductPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-12 text-start font-normal border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                      {selectedProductId ? products.find(p => p.id === selectedProductId)?.name : t.searchProducts}
                      <Search className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl border-slate-200 dark:border-slate-800" align="start">
                    <div className="flex items-center border-b px-3 bg-slate-50 dark:bg-slate-800">
                      <Search className="mr-2 h-4 w-4 opacity-50" />
                      <Input
                        placeholder={t.searchProducts}
                        className="border-none focus-visible:ring-0 shadow-none px-0 bg-transparent h-12"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-72">
                      {filteredProducts.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">{t.noData}</div>
                      ) : (
                        <div className="p-1">
                          {filteredProducts.map((p) => (
                            <div
                              key={p.id}
                              className={cn(
                                "flex cursor-pointer items-center rounded-md px-3 py-3 text-sm transition-colors",
                                "hover:bg-primary/10 hover:text-primary",
                                selectedProductId === p.id && "bg-primary text-primary-foreground"
                              )}
                              onClick={() => {
                                setSelectedProductId(p.id)
                                setIsProductPopoverOpen(false)
                              }}
                            >
                              <div className="flex-1">
                                <p className="font-semibold">{p.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1">${(p.sellingPrice || p.price || 0).toFixed(2)}</Badge>
                                  <span className="text-[10px] text-muted-foreground">{p.quantity} {t.units}</span>
                                </div>
                              </div>
                              <Check className={cn("ml-2 h-4 w-4", selectedProductId === p.id ? "opacity-100" : "opacity-0")} />
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
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.quantity}</Label>
                  <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" className="h-12 border-slate-200 dark:border-slate-800" />
                </div>
                <div className="flex items-end">
                  <Button onClick={addToCart} className="w-full h-12 bg-primary hover:bg-primary/90 shadow-sm">
                    <Plus className="mr-1 h-4 w-4" /> {t.addToCart}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Payment Card */}
          <Card className="border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
            <div className="h-1 bg-accent w-full" />
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <div className="p-2 bg-accent/10 rounded-lg text-accent-foreground">
                  <User className="h-4 w-4" />
                </div>
                {t.customer}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.searchCustomers}</Label>
                <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-12 text-start font-normal border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                      {selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : t.searchCustomers}
                      <Search className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl border-slate-200 dark:border-slate-800" align="start">
                    <div className="flex items-center border-b px-3 bg-slate-50 dark:bg-slate-800">
                      <Search className="mr-2 h-4 w-4 opacity-50" />
                      <Input
                        placeholder={t.searchCustomers}
                        className="border-none focus-visible:ring-0 shadow-none px-0 bg-transparent h-12"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-72">
                      <div className="p-3 text-xs font-bold text-primary uppercase bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => { setSelectedCustomerId(""); setIsCustomerPopoverOpen(false); }}>
                        -- {t.cash} --
                      </div>
                      <div className="p-1">
                        {filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            className={cn(
                              "flex cursor-pointer items-center rounded-md px-3 py-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                              selectedCustomerId === c.id && "bg-slate-100 dark:bg-slate-800 font-bold"
                            )}
                            onClick={() => { setSelectedCustomerId(c.id); setIsCustomerPopoverOpen(false); }}
                          >
                            <div className="flex-1">
                              <p>{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                            </div>
                            <Check className={cn("ml-2 h-4 w-4", selectedCustomerId === c.id ? "opacity-100" : "opacity-0")} />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.paymentType}</Label>
                <RadioGroup defaultValue="cash" value={paymentType} onValueChange={(val) => setPaymentType(val as any)} className="grid grid-cols-2 gap-4">
                  <Label
                    htmlFor="cash"
                    className={cn(
                      "flex items-center justify-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all h-12",
                      paymentType === 'cash' ? "border-primary bg-primary/5 shadow-inner" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                    )}
                  >
                    <RadioGroupItem value="cash" id="cash" className="sr-only" />
                    <Wallet className={cn("h-4 w-4", paymentType === 'cash' ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("font-medium", paymentType === 'cash' ? "text-primary" : "text-slate-600")}>{t.cash}</span>
                  </Label>
                  <Label
                    htmlFor="credit"
                    className={cn(
                      "flex items-center justify-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all h-12",
                      paymentType === 'credit' ? "border-orange-500 bg-orange-500/5 shadow-inner" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                    )}
                  >
                    <RadioGroupItem value="credit" id="credit" className="sr-only" />
                    <CreditCard className={cn("h-4 w-4", paymentType === 'credit' ? "text-orange-500" : "text-muted-foreground")} />
                    <span className={cn("font-medium", paymentType === 'credit' ? "text-orange-600" : "text-slate-600")}>{t.credit}</span>
                  </Label>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Card */}
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b py-4">
            <CardTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-200 text-base">
              <ShoppingCart className="h-5 w-5 text-primary" />
              {t.cart}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-800/30 border-none">
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">{t.product}</TableHead>
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">{t.price}</TableHead>
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">{t.qty}</TableHead>
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">{t.totalPrice}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.length > 0 ? (
                    cart.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800">
                        <TableCell className="font-semibold">{item.productName}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">${item.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{item.quantity}</Badge>
                        </TableCell>
                        <TableCell className="font-bold text-primary">${item.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <ShoppingCart className="h-10 w-10 opacity-20" />
                          <p className="italic">{t.cartEmpty}</p>
                        </div>
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
        <Card className="border-none shadow-2xl bg-slate-900 text-white sticky top-8 overflow-hidden rounded-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/20 rounded-full -ml-16 -mb-16 blur-3xl pointer-events-none" />
          
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight">{t.completeSale}</CardTitle>
            <CardDescription className="text-slate-400 text-xs">{t.detailedBreakdown}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-slate-400 text-sm">{t.subtotal}</span>
                <span className="font-semibold font-mono">${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="totalDiscount" className="text-xs font-bold text-slate-400 flex items-center gap-2">
                  <Tag className="h-3 w-3 text-accent" /> {t.discount}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                  <Input 
                    id="totalDiscount" 
                    type="number" 
                    className="pl-7 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 focus-visible:ring-accent" 
                    value={totalDiscount} 
                    onChange={(e) => setTotalDiscount(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between items-end">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{t.finalTotal}</span>
                  <span className="text-4xl font-black text-accent font-mono tracking-tighter">
                    ${finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <Button 
              className="w-full bg-accent hover:bg-accent/90 text-primary font-bold py-8 text-xl shadow-lg transition-transform active:scale-95 group rounded-xl" 
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
            >
              {t.completeSale}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-medium">
              <Check className="h-3 w-3" />
              {t.tip2}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales History Snippet */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              {t.recentSales}
            </h3>
            <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800">{recentSales.length}</Badge>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <Table>
              <TableBody>
                {recentSales.map(sale => (
                  <TableRow key={sale.id} className="text-xs border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <TableCell className="py-3">
                      <p className="font-bold text-slate-700 dark:text-slate-300">{sale.productName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </TableCell>
                    <TableCell className="py-3">
                       <span className={cn(
                         "px-1.5 py-0.5 rounded text-[9px] font-bold",
                         sale.paymentType === 'cash' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                       )}>
                         {sale.paymentType === 'cash' ? t.cash : t.credit}
                       </span>
                    </TableCell>
                    <TableCell className="py-3 font-black text-primary text-right">${sale.totalPrice.toFixed(2)}</TableCell>
                    <TableCell className="py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => handleReturn(sale.id)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {recentSales.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-xs italic">{t.noSales}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
