
"use client"

import { useEffect, useState } from "react"
import { db, Product } from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Edit2, Trash2, Search, TrendingUp } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const { toast } = useToast()

  // Form State
  const [formData, setFormData] = useState({ name: "", purchasePrice: "", sellingPrice: "", quantity: "" })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = () => {
    setProducts(db.getProducts())
  }

  const handleSave = () => {
    if (!formData.name || !formData.purchasePrice || !formData.sellingPrice || !formData.quantity) {
      toast({ title: "Incomplete form", description: "Please fill all fields.", variant: "destructive" })
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
      toast({ title: "Success", description: "Product updated successfully." })
    } else {
      db.addProduct(payload)
      toast({ title: "Success", description: "Product added successfully." })
    }

    loadProducts()
    setIsModalOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      db.deleteProduct(id)
      loadProducts()
      toast({ title: "Deleted", description: "Product removed from catalog." })
    }
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
          <h1 className="text-3xl font-headline font-bold text-primary">Products</h1>
          <p className="text-muted-foreground">Manage your inventory, costs, and pricing.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Product Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Wireless Mouse"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                  <Input 
                    id="purchasePrice" 
                    type="number" 
                    value={formData.purchasePrice} 
                    onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} 
                    placeholder="Cost price"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sellingPrice">Selling Price ($)</Label>
                  <Input 
                    id="sellingPrice" 
                    type="number" 
                    value={formData.sellingPrice} 
                    onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})} 
                    placeholder="Sale price"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Stock Quantity</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  value={formData.quantity} 
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                  placeholder="0"
                />
              </div>
              {formData.purchasePrice && formData.sellingPrice && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-between border border-green-100 dark:border-green-900">
                  <span className="text-sm text-green-700 dark:text-green-400 font-medium">Estimated profit per unit:</span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-400">
                    ${(parseFloat(formData.sellingPrice) - parseFloat(formData.purchasePrice)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          className="pl-10" 
          placeholder="Search products..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[300px]">Product Name</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Expected Profit</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                        {product.quantity} units
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                        <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No products found. Add some to get started!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
