
"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { db, getLocalDateString, getRealizedSaleRevenue, getRealizedSaleProfit, DB_UPDATE_EVENT } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, BarChart2, ShoppingBag, CreditCard, Calendar, HardDrive, Download, Upload, Wallet, TrendingUp } from "lucide-react"
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
    
    // 1. حسابات اليوم (اليوم = المبيعات النقدية + الديون المحصلة اليوم)
    const salesToday = sales.filter(s => s.date === today)
    const paymentsToday = payments.filter(p => p.date === today)
    
    const revenueFromSalesToday = salesToday.reduce((sum, s) => sum + getRealizedSaleRevenue(s), 0)
    const profitFromSalesToday = salesToday.reduce((sum, s) => sum + getRealizedSaleProfit(s), 0)
    const debtCollectedToday = paymentsToday.reduce((sum, p) => sum + Number(p.amount), 0)

    const totalRevenueToday = revenueFromSalesToday + debtCollectedToday
    const totalProfitToday = profitFromSalesToday + debtCollectedToday 

    // 2. حسابات الشهر (المبيعات النقدية للشهر + الديون المحصلة في الشهر)
    const salesMonth = sales.filter(s => s.date && s.date.startsWith(currentMonthPrefix))
    const paymentsMonth = payments.filter(p => p.date && p.date.startsWith(currentMonthPrefix))
    
    const revenueMonth = salesMonth.reduce((sum, s) => sum + getRealizedSaleRevenue(s), 0) + 
                         paymentsMonth.reduce((sum, p) => sum + Number(p.amount), 0)
    
    const profitMonth = salesMonth.reduce((sum, s) => sum + getRealizedSaleProfit(s), 0) +
                        paymentsMonth.reduce((sum, p) => sum + Number(p.amount), 0)
    
    // المنتج الأكثر مبيعاً
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
    toast({ title: t.success, description: "تم تصدير نسخة احتياطية بنجاح" })
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
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> {t.exportData}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> {t.importData}
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* اليوم */}
        <Card className="border-none shadow-md bg-blue-50 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {t.todayRevenue}
              <DollarSign className="w-4 h-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">${stats.revenueToday.toFixed(2)}</div>
            <p className="text-[10px] text-blue-600/80">تشمل الكاش + تحصيلات الديون</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-green-50 dark:bg-green-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {t.todayProfit}
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">${stats.profitToday.toFixed(2)}</div>
            <p className="text-[10px] text-green-600/80">صافي الأرباح المحصلة فعلياً</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-amber-50 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              ديون محصلة اليوم
              <Wallet className="w-4 h-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">${stats.debtCollectedToday.toFixed(2)}</div>
            <p className="text-[10px] text-amber-600/80">المبالغ المستلمة من مديونيات قديمة</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-purple-50 dark:bg-purple-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              صافي ربح الشهر
              <BarChart2 className="w-4 h-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">${stats.profitMonth.toFixed(2)}</div>
            <p className="text-[10px] text-purple-600/80">إجمالي الأرباح المحققة لهذا الشهر</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t.totalProducts}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">{t.productCatalog}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t.todaySales}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalSalesToday}</div>
            <p className="text-xs text-muted-foreground">{t.salesRecorded}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إيرادات الشهر (كاش)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">${stats.revenueMonth.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">إجمالي النقدية المحصلة هذا الشهر</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
