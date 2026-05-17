
"use client"

import { useEffect, useState, useCallback } from "react"
import { db, Product, DB_UPDATE_EVENT } from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Edit2, Trash2, Search, TrendingUp } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/context/language-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ProductsPage() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({ name: "", purchasePrice: "", sellingPrice: "", quantity: "" })

  const loadProducts = useCallback(() => {
    setProducts(db.getProducts())
  }, [])

  useEffect(() => {
    loadProducts()
    
    window.addEventListener(DB_UPDATE_EVENT, loadProducts)
    window.addEventListener('storage', loadProducts)
    
    return () => {
      window.removeEventListener(DB_UPDATE_EVENT, loadProducts)
      window.removeEventListener('storage', loadProducts)
    };
  }, [loadProducts])

  const handleSave = () => {
    if (!formData.name || !formData.purchasePrice || !formData.sellingPrice || !formData.quantity) {
      toast({ title: t.error, description: "Please fill all fields.", variant: "destructive" })
      return
    }

    const payload = {
      name: formData.name,
      purchasePrice: parseFloat(formData.purchasePrice),
      sellingPrice: parseFloat(formData.sellingPrice),
      quantity: parseInt(formData.quantity)
    }

    if (editingProduct) {
      db.updateProduct(editingProduct.id, payload)
      toast({ title: t.success, description: t.productUpdated })
    } else {
      db.addProduct(payload)
      toast({ title: t.success, description: t.productAdded })
    }

    loadProducts()
    setIsModalOpen(false)
    resetForm()
  }

  const handleDelete = () => {
    if (!productToDelete) return
    db.deleteProduct(productToDelete)
    loadProducts()
    toast({ title: t.success, description: "Product removed." })
    setProductToDelete(null)
  }

  const resetForm = () => {
    setFormData({ name: "", purchasePrice: "", sellingPrice: "", quantity: "" })
    setEditingProduct(null)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      purchasePrice: (product.purchasePrice || 0).toString(),
      sellingPrice: (product.sellingPrice || product.price || 0).toString(),
      quantity: product.quantity.toString()
    })
    setIsModalOpen(true)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">{t.products}</h1>
          <p className="text-muted-foreground">{t.welcome}</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> {t.addProduct}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? t.editProduct : t.addProduct}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t.productName}</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="purchasePrice">{t.purchasePrice}</Label>
                  <Input 
                    id="purchasePrice" 
                    type="number" 
                    value={formData.purchasePrice} 
                    onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sellingPrice">{t.sellingPrice}</Label>
                  <Input 
                    id="sellingPrice" 
                    type="number" 
                    value={formData.sellingPrice} 
                    onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})} 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">{t.stock}</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  value={formData.quantity} 
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                />
              </div>
              {formData.purchasePrice && formData.sellingPrice && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-between border border-green-100 dark:border-green-900">
                  <span className="text-sm text-green-700 dark:text-green-400 font-medium">{t.estimatedProfitPerUnit}:</span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-400">
                    ${(parseFloat(formData.sellingPrice) - parseFloat(formData.purchasePrice)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t.cancel}</Button>
              <Button onClick={handleSave}>{t.save}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className={`absolute ${t.lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
        <Input 
          className={t.lang === 'ar' ? 'pr-10' : 'pl-10'} 
          placeholder={t.searchProducts} 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[300px]">{t.productName}</TableHead>
              <TableHead>{t.purchasePrice}</TableHead>
              <TableHead>{t.sellingPrice}</TableHead>
              <TableHead>{t.expectedProfit}</TableHead>
              <TableHead>{t.stock}</TableHead>
              <TableHead className={t.lang === 'ar' ? 'text-left' : 'text-right'}>{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const purchasePrice = product.purchasePrice || 0;
                const sellingPrice = product.sellingPrice || product.price || 0;
                const profit = sellingPrice - purchasePrice;
                
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">${purchasePrice.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold text-primary">${sellingPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                        <TrendingUp className="h-3 w-3" />
                        ${profit.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${product.quantity < 10 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {product.quantity} {t.units}
                      </span>
                    </TableCell>
                    <TableCell className={`${t.lang === 'ar' ? 'text-left' : 'text-right'} space-x-2 rtl:space-x-reverse`}>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                        <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setProductToDelete(product.id)}>
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {t.noData}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t.save}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
