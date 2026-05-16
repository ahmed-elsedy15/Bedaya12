
"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { db, getLocalDateString, getRealizedSaleRevenue, getRealizedSaleProfit, DB_UPDATE_EVENT } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, BarChart2, ShoppingBag, CreditCard, Calendar, HardDrive, Download, Upload, Wallet } from "lucide-react"
import { useTranslation } from "@/context/language-context"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function Dashboard() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSalesToday: 0,
    bestSeller: "None",
    revenueToday: 0,
    profitToday: 0,
    profitMonth: 0,
    revenueMonth: 0,
    debtCollectedToday: 0
  })

  const loadStats = useCallback(() => {
    const products = db.getProducts()
    const sales = db.getSales()
    const payments = db.getPayments()
    
    const today = getLocalDateString();
    const currentMonthPrefix = today.substring(0, 7)
    
    // حساب مبيعات اليوم (الكاش فقط)
    const salesToday = sales.filter(s => s.date === today)
    const revenueFromSalesToday = salesToday.reduce((sum, s) => sum + getRealizedSaleRevenue(s), 0)
    const profitFromSalesToday = salesToday.reduce((sum, s) => sum + getRealizedSaleProfit(s), 0)

    // حساب تحصيلات الديون اليوم
    const paymentsToday = payments.filter(p => p.date === today)
    const debtCollectedToday = paymentsToday.reduce((sum, p) => sum + Number(p.amount), 0)

    // الإيرادات اليوم = الكاش من المبيعات + تحصيلات الديون
    const totalRevenueToday = revenueFromSalesToday + debtCollectedToday
    
    // الربح اليوم = الأرباح المحققة من مبيعات اليوم + تحصيلات الديون
    // نعتبر تحصيل الدين كربح محقق لأنه يمثل تدفقاً نقدياً دخل النشاط لتغطية بضاعة تم حساب تكلفتها مسبقاً
    const totalProfitToday = profitFromSalesToday + debtCollectedToday 

    // حسابات الشهر
    const salesMonth = sales.filter(s => s.date && s.date.startsWith(currentMonthPrefix))
    const paymentsMonth = payments.filter(p => p.date && p.date.startsWith(currentMonthPrefix))
    
    const revenueMonth = salesMonth.reduce((sum, s) => sum + getRealizedSaleRevenue(s), 0) + 
                         paymentsMonth.reduce((sum, p) => sum + Number(p.amount), 0)
    
    const profitMonth = salesMonth.reduce((sum, s) => sum + getRealizedSaleProfit(s), 0) +
                        paymentsMonth.reduce((sum, p) => sum + Number(p.amount), 0)
    
    const productSoldCounts: Record<string, number> = {}
    sales.forEach(s => {
      productSoldCounts[s.productName] = (productSoldCounts[s.productName] || 0) + s.quantitySold
    })
    
    let bestSeller = "None"
    let maxSold = 0
    Object.entries(productSoldCounts).forEach(([name, count]) => {
      if (count > maxSold) {
        maxSold = count
        bestSeller = name
      }
    })

    setStats({
      totalProducts: products.length,
      totalSalesToday: salesToday.length,
      revenueToday: totalRevenueToday,
      profitToday: totalProfitToday,
      profitMonth,
      revenueMonth,
      bestSeller,
      debtCollectedToday
    })
  }, [])

  useEffect(() => {
    loadStats()
    window.addEventListener(DB_UPDATE_EVENT, loadStats)
    window.addEventListener('storage', loadStats)
    return () => {
      window.removeEventListener(DB_UPDATE_EVENT, loadStats)
      window.removeEventListener('storage', loadStats)
    }
  }, [loadStats])

  const handleExport = () => {
    const data = {
      products: db.getProducts(),
      sales: db.getSales(),
      customers: db.getCustomers(),
      payments: db.getPayments(),
      exportDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `salesphere_backup_${getLocalDateString()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({ title: t.success, description: "Backup exported successfully." })
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        db.importAll(data)
        toast({ title: t.success, description: t.importSuccess })
        loadStats()
      } catch (err) {
        toast({ title: t.error, description: t.importError, variant: "destructive" })
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold text-primary">{t.dashboard}</h1>
          <p className="text-muted-foreground">{t.welcome}</p>
        </div>
        
        <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-900/10 max-w-md">
          <CardContent className="p-4 flex items-center gap-4">
            <HardDrive className="w-8 h-8 text-blue-600" />
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400">{t.storageStatus}</p>
              <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">{t.localOnly}</p>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={handleExport} title={t.exportData}>
                <Download className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} title={t.importData}>
                <Upload className="h-4 w-4" />
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleImport} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{t.totalProducts}</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">{t.productCatalog}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{t.todaySales}</CardTitle>
            <ShoppingBag className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSalesToday}</div>
            <p className="text-xs text-muted-foreground">{t.salesRecorded}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{t.todayRevenue}</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${stats.revenueToday.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{t.dailyIncome} (كاش)</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-green-50/50 dark:bg-green-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">{t.todayProfit}</CardTitle>
            <BarChart2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">${stats.profitToday.toFixed(2)}</div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">صافي الأرباح المحصلة فعلياً</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-amber-50/50 dark:bg-amber-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">تحصيل ديون قديمة</CardTitle>
            <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">${stats.debtCollectedToday.toFixed(2)}</div>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80">المبالغ التي استلمتها من العملاء اليوم</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">{t.monthRevenue}</CardTitle>
            <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">${stats.revenueMonth.toFixed(2)}</div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">{t.totalMonthRevenue} (كاش)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
