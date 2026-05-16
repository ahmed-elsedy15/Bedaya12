
"use client"

import { useEffect, useState, useCallback } from "react"
import { db, Customer, DB_UPDATE_EVENT } from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Search, Phone, User, DollarSign, Edit2, Trash2, Wallet } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/context/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CustomersPage() {
  const { t } = useTranslation()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [formData, setFormData] = useState({ name: "", phone: "" })
  const { toast } = useToast()

  const loadCustomers = useCallback(() => {
    setCustomers(db.getCustomers())
  }, [])

  useEffect(() => {
    loadCustomers()
    
    window.addEventListener(DB_UPDATE_EVENT, loadCustomers)
    window.addEventListener('storage', loadCustomers)
    
    return () => {
      window.removeEventListener(DB_UPDATE_EVENT, loadCustomers)
      window.removeEventListener('storage', loadCustomers)
    };
  }, [loadCustomers])

  const handleSave = () => {
    if (!formData.name || !formData.phone) {
      toast({ title: t.error, description: "Please fill all fields.", variant: "destructive" })
      return
    }

    if (editingCustomer) {
      db.updateCustomer(editingCustomer.id, formData)
      toast({ title: t.success, description: "Customer updated successfully." })
    } else {
      db.addCustomer(formData)
      toast({ title: t.success, description: "Customer added successfully." })
    }

    loadCustomers()
    setIsModalOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (confirm(t.deleteConfirm)) {
      db.deleteCustomer(id)
      loadCustomers()
      toast({ title: t.success, description: "Customer removed." })
    }
  }

  const handlePayDebt = () => {
    if (!selectedCustomer || !payAmount) return
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) return

    db.updateCustomerDebt(selectedCustomer.id, -amount)
    toast({ title: t.success, description: t.debtCleared })
    loadCustomers()
    setIsPayModalOpen(false)
    setPayAmount("")
    setSelectedCustomer(null)
  }

  const resetForm = () => {
    setFormData({ name: "", phone: "" })
    setEditingCustomer(null)
  }

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({ name: customer.name, phone: customer.phone })
    setIsModalOpen(true)
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  )

  const totalDebt = customers.reduce((sum, c) => sum + (Number(c.totalDebt) || 0), 0)

  // حساب المديونية المتبقية للعرض في النافذة
  const currentTotalDebt = Number(selectedCustomer?.totalDebt) || 0;
  const currentPayAmount = parseFloat(payAmount) || 0;
  const remainingDebtAmount = Math.max(0, currentTotalDebt - currentPayAmount);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">{t.customers}</h1>
          <p className="text-muted-foreground">{t.welcome}</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> {t.addCustomer}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? t.editCustomer : t.addCustomer}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t.customerName}</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">{t.phone}</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t.cancel}</Button>
              <Button onClick={handleSave}>{t.save}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-red-50 dark:bg-red-900/10 col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">{t.totalDebt}</CardTitle>
            <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">${totalDebt.toFixed(2)}</div>
            <p className="text-xs text-red-600/80 dark:text-red-400/80">{t.topDebtors}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className={`absolute ${t.lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
        <Input 
          className={t.lang === 'ar' ? 'pr-10' : 'pl-10'} 
          placeholder={t.searchCustomers} 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>{t.customerName}</TableHead>
              <TableHead>{t.phone}</TableHead>
              <TableHead>{t.totalDebt}</TableHead>
              <TableHead className={t.lang === 'ar' ? 'text-left' : 'text-right'}>{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {customer.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${customer.totalDebt > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'}`}>
                      ${(Number(customer.totalDebt) || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className={`${t.lang === 'ar' ? 'text-left' : 'text-right'} space-x-2 rtl:space-x-reverse`}>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                      <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)}>
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                    {customer.totalDebt > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setIsPayModalOpen(true)
                        }}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        {t.payDebt}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {t.noCustomers}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.payDebt} - {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground uppercase">{t.totalDebt}</Label>
                <div className="text-xl font-bold text-red-600">
                  ${currentTotalDebt.toFixed(2)}
                </div>
              </div>
              <div className="h-10 w-px bg-border mx-4" />
              <div className="grid gap-1 text-right">
                <Label className="text-xs text-muted-foreground uppercase">{t.remainingDebt}</Label>
                <div className={`text-xl font-bold ${remainingDebtAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  ${remainingDebtAmount.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="grid gap-3">
              <Label htmlFor="payAmount" className="font-bold">{t.amountToPay}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="payAmount" 
                  type="number"
                  className="pl-9 h-12 text-lg font-bold"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground italic">
                {t.tip2}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayModalOpen(false)}>{t.cancel}</Button>
            <Button onClick={handlePayDebt} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8">
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
