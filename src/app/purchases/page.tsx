"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { db, Product, Purchase, DB_UPDATE_EVENT } from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Search, Truck, PackagePlus, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/context/language-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function PurchasesPage() {
  const { t, dir } = useTranslation()
  const { toast } = useToast()

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const productDropdownRef = useRef<HTMLDivElement>(null)

  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false)
  const supplierDropdownRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    productId: "",
    quantity: "",
    purchasePrice: "",
    sellingPrice: "",
    supplierName: ""
  })

  const loadData = useCallback(() => {
    setPurchases(db.getPurchases())
    setProducts(db.getProducts())
  }, [])

  useEffect(() => {
    loadData()
    window.addEventListener(DB_UPDATE_EVENT, loadData)
    window.addEventListener('storage', loadData)
    return () => {
      window.removeEventListener(DB_UPDATE_EVENT, loadData)
      window.removeEventListener('storage', loadData)
    }
  }, [loadData])

  // إغلاق قائمة المنتجات لما تدوس برا منها
  useEffect(() => {
    if (!isProductPopoverOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setIsProductPopoverOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isProductPopoverOpen])

  // إغلاق قائمة الموردين لما تدوس برا منها
  useEffect(() => {
    if (!isSupplierDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setIsSupplierDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isSupplierDropdownOpen])

  const filteredProducts = useMemo(() => {
    const term = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(term))
  }, [products, productSearch])

  // قائمة أسماء الموردين اللي اتسجلوا قبل كده (بدون تكرار)
  const uniqueSuppliers = useMemo(() => {
    const names = purchases
      .map(p => p.supplierName)
      .filter((s): s is string => !!s && s.trim() !== "")
    return Array.from(new Set(names))
  }, [purchases])

  const filteredSuppliers = useMemo(() => {
    const term = formData.supplierName.toLowerCase()
    if (!term) return uniqueSuppliers
    return uniqueSuppliers.filter(s => s.toLowerCase().includes(term))
  }, [uniqueSuppliers, formData.supplierName])

  const handleSave = () => {
    if (!formData.productId || !formData.quantity || !formData.purchasePrice || !formData.sellingPrice) {
      toast({ title: t.error, description: "يرجى ملء جميع الحقول المطلوبة واختيار المنتج.", variant: "destructive" })
      return
    }

    try {
      db.recordPurchase(
        formData.productId,
        parseInt(formData.quantity),
        parseFloat(formData.purchasePrice),
        parseFloat(formData.sellingPrice),
        formData.supplierName
      )
      toast({ title: t.success, description: "تم تحديث المخزون والأسعار بنجاح." })
      setIsModalOpen(false)
      resetFormData()
      loadData()
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" })
    }
  }

  const resetFormData = () => {
    setFormData({ productId: "", quantity: "", purchasePrice: "", sellingPrice: "", supplierName: "" })
    setProductSearch("")
    setIsProductPopoverOpen(false)
    setIsSupplierDropdownOpen(false)
  }

  const filteredPurchases = purchases.filter(p =>
    p.productName.toLowerCase().includes(search.toLowerCase()) ||
    (p.supplierName && p.supplierName.toLowerCase().includes(search.toLowerCase()))
  )

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  return (
    <div className="p-8 space-y-8" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">{t.purchases}</h1>
          <p className="text-muted-foreground">إدارة دخول البضاعة الجديدة وفواتير المشتريات.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetFormData(); }}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Plus className="h-4 w-4" /> {t.addPurchase}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{t.addPurchase}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label className="font-bold text-xs uppercase text-muted-foreground">{t.productName}</Label>

                <div className="relative" ref={productDropdownRef}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsProductPopoverOpen((v) => !v)}
                    className={cn(
                      "w-full justify-between h-12 text-start font-medium border-2",
                      formData.productId ? "border-primary/30" : "border-slate-200"
                    )}
                  >
                    <span className="truncate">
                      {formData.productId ? products.find(p => p.id === formData.productId)?.name : t.searchProducts}
                    </span>
                    <Search className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                  </Button>

                  {isProductPopoverOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border-2 bg-popover shadow-xl">
                      <div className="flex items-center border-b px-3 ">
                        <Search className="mr-2 h-4 w-4 opacity-50" />
                        <Input
                          placeholder={t.searchProducts}
                          className="border-none focus-visible:ring-0 shadow-none bg-transparent h-12 font-medium"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <ScrollArea className="h-72">
                        <div className="p-2 space-y-1">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className={cn(
                                  "flex w-full items-center justify-between rounded-md px-3 py-3 text-sm transition-colors",
                                  formData.productId === p.id ? "bg-primary text-primary-foreground" : "hover:bg-primary/10 text-slate-700"
                                )}
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    productId: p.id,
                                    purchasePrice: (p.purchasePrice || 0).toString(),
                                    sellingPrice: (p.sellingPrice || p.price || 0).toString()
                                  });
                                  setIsProductPopoverOpen(false);
                                  setProductSearch("");
                                }}
                              >
                                <span className="font-bold truncate max-w-[180px]">{p.name}</span>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                                    {t.stock}: {p.quantity}
                                  </Badge>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="py-8 text-center space-y-3">
                              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                              <p className="text-sm text-muted-foreground italic px-4">
                                لا يوجد منتج بهذا الاسم.
                              </p>
                              <Button asChild variant="link" size="sm" className="text-primary font-bold">
                                <Link href="/products" className="flex items-center gap-1">
                                  <PackagePlus className="h-4 w-4" />
                                  {t.addProduct}
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quantity" className="font-bold text-xs text-muted-foreground uppercase">{t.qtyAdded}</Label>
                <Input id="quantity" type="number" className="h-12 border-2" value={formData.quantity} onChange={(e)=>setFormData({...formData,quantity:e.target.value})}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2 text-indigo-600">
                  <Label htmlFor="purchasePrice" className="font-bold text-xs uppercase">{t.purchasePrice} (جديد)</Label>
                  <Input id="purchasePrice" type="number" className="h-12 border-2 border-indigo-200 focus:border-indigo-500" value={formData.purchasePrice} onChange={(e)=>setFormData({...formData,purchasePrice:e.target.value})}/>
                </div>
                <div className="grid gap-2 text-green-600">
                  <Label htmlFor="sellingPrice" className="font-bold text-xs uppercase">{t.sellingPrice} (جديد)</Label>
                  <Input id="sellingPrice" type="number" className="h-12 border-2 border-green-200 focus:border-green-500" value={formData.sellingPrice} onChange={(e)=>setFormData({...formData,sellingPrice:e.target.value})}/>
                </div>
              </div>

              <div className="grid gap-2 relative" ref={supplierDropdownRef}>
                  <Label htmlFor="supplier" className="font-bold text-xs text-muted-foreground uppercase">{t.supplier}</Label>
                  <Input id="supplier" className="h-12 border-2" value={formData.supplierName} onChange={(e)=>{setFormData({...formData,supplierName:e.target.value});setIsSupplierDropdownOpen(true)}} onFocus={()=>setIsSupplierDropdownOpen(true)} autoComplete="off"/>
                  {isSupplierDropdownOpen && filteredSuppliers.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full rounded-md border-2 bg-popover shadow-xl max-h-40 overflow-auto">
                      <div className="p-1 space-y-1">
                        {filteredSuppliers.map((name)=>(
                          <button key={name} type="button" className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-primary/10 text-slate-200 transition-colors truncate text-start" onClick={()=>{setFormData({...formData,supplierName:name});setIsSupplierDropdownOpen(false)}}>
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {formData.purchasePrice && formData.sellingPrice && (
                <div className="p-4 bg-primary/5 rounded-xl flex items-center justify-between border border-primary/10">
                  <span className="text-sm font-bold text-slate-600">{t.estimatedProfitPerUnit}:</span>
                  <span className="text-xl font-black text-primary">
                    ${(parseFloat(formData.sellingPrice) - parseFloat(formData.purchasePrice)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="h-12">{t.cancel}</Button>
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 px-8">
                {t.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className={`absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
        <Input
          className="ltr:pl-10 rtl:pr-10 h-12 border-2"
          placeholder="ابحث عن منتج أو مورد في السجلات..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border-2 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-none">
              <TableHead className="font-bold">{t.product}</TableHead>
              <TableHead className="font-bold">{t.qtyAdded}</TableHead>
              <TableHead className="font-bold">{t.purchasePrice}</TableHead>
              <TableHead className="font-bold">{t.sellingPrice}</TableHead>
              <TableHead className="font-bold">{t.supplier}</TableHead>
              <TableHead className="font-bold">{t.time}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.length > 0 ? (
              filteredPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-black text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-indigo-500" />
                      {purchase.productName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold">
                      +{purchase.quantityAdded}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-indigo-600 font-bold">
                    ${purchase.purchasePrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-green-600 font-black">
                    ${purchase.sellingPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-medium">
                    {purchase.supplierName || "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 dark:text-slate-100">{formatDate(purchase.timestamp)}</span>
                      <span className="font-medium opacity-80 text-[10px]">
                        {new Date(purchase.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                  لا توجد فواتير مشتريات مسجلة بعد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}