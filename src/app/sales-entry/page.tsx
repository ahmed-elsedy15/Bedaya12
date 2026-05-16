
"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { db, Product, Sale, Customer } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, History, Search, Check } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTranslation } from "@/context/language-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export default function SalesEntryPage() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash')
  const [quantity, setQuantity] = useState("1")
  const [discount, setDiscount] = useState("0")
  const [productSearch, setProductSearch] = useState("")
  const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false)
  
  const { toast } = useToast()

  const loadData = useCallback(() => {
    const allProducts = db.getProducts();
    setProducts(allProducts.filter(p => p.quantity > 0))
    setCustomers(db.getCustomers())
    setRecentSales(db.getSales().slice(0, 10))
  }, [])

  useEffect(() => {
    loadData()
    
    const handleSync = () => loadData();
    window.addEventListener('cloud-sync-complete', handleSync);
    window.addEventListener('storage', handleSync);
    
    return () => {
      window.removeEventListener('cloud-sync-complete', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadData])

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    )
  }, [products, productSearch])

  const selectedProduct = products.find(p => p.id === selectedProductId)
  const displayPrice = selectedProduct ? (Number(selectedProduct.sellingPrice) || Number(selectedProduct.price) || 0) : 0;
  
  const totalBeforeDiscount = displayPrice * (parseInt(quantity) || 0);
  const finalTotal = Math.max(0, totalBeforeDiscount - (parseFloat(discount) || 0));

  const handleSale = () => {
    if (!selectedProductId || !quantity) {
      toast({ title: t.error, description: "Select a product and quantity.", variant: "destructive" })
      return
    }

    if (paymentType === 'credit' && !selectedCustomerId) {
      toast({ title: t.error, description: "Please select a customer for credit sales.", variant: "destructive" })
      return
    }

    const qty = parseInt(quantity)
    const dsc = parseFloat(discount) || 0
    
    if (isNaN(qty) || qty <= 0) {
      toast({ title: t.error, description: "Enter a valid quantity.", variant: "destructive" })
      return
    }

    try {
      db.recordSale(selectedProductId, qty, paymentType, selectedCustomerId || undefined, dsc)
      toast({ title: t.saleRecorded, description: "Success." })
      loadData()
      setSelectedProductId("")
      setSelectedCustomerId("")
      setPaymentType('cash')
      setQuantity("1")
      setDiscount("0")
      setProductSearch("")
    } catch (err: any) {
      toast({ title: t.saleFailed, description: err.message === 'Insufficient stock' ? t.insufficientStock : err.message, variant: "destructive" })
    }
  }

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">{t.salesEntry}</h1>
          <p className="text-muted-foreground">{t.welcome}</p>
        </div>

        <Card className="border-none shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-accent" />
              {t.newTransaction}
            </CardTitle>
            <CardDescription>{t.detailedBreakdown}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label>{t.selectProduct}</Label>
              <Popover open={isProductPopoverOpen} onOpenChange={setIsProductPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isProductPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedProductId
                      ? products.find((p) => p.id === selectedProductId)?.name
                      : t.searchProducts}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                      placeholder={t.searchProducts}
                      className="border-none focus-visible:ring-0 shadow-none px-0"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-72">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t.noData}
                      </div>
                    ) : (
                      <div className="p-1">
                        {filteredProducts.map((p) => (
                          <div
                            key={p.id}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              selectedProductId === p.id && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => {
                              setSelectedProductId(p.id)
                              setIsProductPopoverOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProductId === p.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ${(Number(p.sellingPrice) || Number(p.price) || 0).toFixed(2)} - {p.quantity} {t.units}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t.customer} (Optional for Cash)</Label>
                <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.searchCustomers} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>{t.paymentType}</Label>
                <RadioGroup 
                  defaultValue="cash" 
                  value={paymentType} 
                  onValueChange={(val) => setPaymentType(val as any)}
                  className="flex gap-4 p-2 bg-muted rounded-md"
                >
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="qty">{t.quantity}</Label>
                <Input 
                  id="qty" 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  min="1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discount">{t.discount}</Label>
                <Input 
                  id="discount" 
                  type="number" 
                  value={discount} 
                  onChange={(e) => setDiscount(e.target.value)} 
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t.finalTotal}</Label>
                <div className="h-10 px-3 py-2 rounded-md bg-accent/20 border border-accent/30 flex items-center font-bold text-primary">
                  ${finalTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <Button className="w-full bg-accent hover:bg-accent/90 text-primary font-bold py-6 shadow-md" onClick={handleSale}>
              {t.completeSale}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-headline font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            {t.recentSales}
          </h2>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>{t.product}</TableHead>
                  <TableHead>{t.qty}</TableHead>
                  <TableHead>{t.discount}</TableHead>
                  <TableHead>{t.totalPrice}</TableHead>
                  <TableHead>{t.paymentType}</TableHead>
                  <TableHead>{t.time}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map(sale => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.productName}</TableCell>
                    <TableCell>{sale.quantitySold}</TableCell>
                    <TableCell className="text-red-500 text-xs">
                      {sale.discount > 0 ? `-$${sale.discount.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="font-bold">${(Number(sale.totalPrice) || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sale.paymentType === 'credit' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {sale.paymentType === 'credit' ? t.credit : t.cash}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                  </TableRow>
                ))}
                {recentSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">{t.noData}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">{t.tips}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm opacity-90 space-y-4">
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">1</div>
              <p>{t.tip1}</p>
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">2</div>
              <p>{t.tip2}</p>
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">3</div>
              <p>تسجيل المبيعات الآجلة (Credit) يضيف تلقائياً مبلغ المديونية لحساب العميل.</p>
            </div>
            <div className="p-3 bg-white/10 rounded-lg border border-white/10 mt-4">
              <p className="font-bold mb-1">💡 نصيحة الخصم:</p>
              <p className="text-xs">استخدم خانة الخصم لتقليل المبلغ النهائي؛ سيتم خصم هذا المبلغ من أرباحك الصافية تلقائياً.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
