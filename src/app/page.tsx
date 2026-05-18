
"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { db, getLocalDateString, DB_UPDATE_EVENT } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, BarChart2, Download, Upload, TrendingUp, ArrowUpRight, ShoppingBag, Box, Wallet } from "lucide-react"
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
    revenueToday: 0,
    profitToday: 0,
    profitMonth: 0,
    revenueMonth: 0,
    debtIssuedToday: 0,
    debtPaidToday: 0,
  })

  const loadStats = useCallback(() => {
    const products = db.getProducts();
    const allSales = db.getSales();
    const allPayments = db.getPayments();

    const todayStr = getLocalDateString();
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    // 1. إحصائيات اليوم (بناءً على مبيعات اليوم)
    const salesToday = allSales.filter(s => s.date === todayStr);
    const revenueToday = salesToday.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const profitToday = salesToday.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const debtIssuedToday = salesToday.reduce((sum, s) => sum + (Number(s.debtAmount) || 0), 0);

    // 2. الديون المسددة اليوم (من سجل المدفوعات الفعلي)
    const paymentsToday = allPayments.filter(p => p.date === todayStr);
    const debtPaidToday = paymentsToday.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 3. إحصائيات الشهر (تشمل اليوم الحالي)
    const salesMonth = allSales.filter(s => s.date && s.date.startsWith(currentMonthPrefix));
    const revenueMonthTotal = salesMonth.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const profitMonthTotal = salesMonth.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);

    setStats({
      totalProducts: products.length,
      totalSalesToday: salesToday.length,
      revenueToday: revenueToday,
      profitToday: profitToday,
      profitMonth: profitMonthTotal,
      revenueMonth: revenueMonthTotal,
      debtIssuedToday: debtIssuedToday,
      debtPaidToday: debtPaidToday,
    });
  }, []);

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
    a.download = `backup_${getLocalDateString()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({ title: t.success, description: t.exportData })
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
    <div
      className="p-8 space-y-8 min-h-screen bg-center bg-cover bg-no-repeat"
      style={{
        backgroundImage: "url('/king2.png')",
        backgroundSize: "400px",
        backgroundPosition: "bottom center"
      }}
    >
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

      {/* الصف العلوي: إحصائيات اليوم */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-md bg-blue-50 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-blue-800 dark:text-blue-300">
              {t.todayRevenue}
              <DollarSign className="w-4 h-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">${stats.revenueToday.toFixed(2)}</div>
            <p className="text-[10px] text-blue-600/80">إجمالي قيمة مبيعات اليوم</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-green-50 dark:bg-green-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-green-800 dark:text-green-300">
              {t.todayProfit}
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">${stats.profitToday.toFixed(2)}</div>
            <p className="text-[10px] text-green-600/80">صافي ربح مبيعات اليوم</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-red-50 dark:bg-red-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-red-800 dark:text-red-300">
              {t.debtIssuedToday}
              <ArrowUpRight className="w-4 h-4 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">${stats.debtIssuedToday.toFixed(2)}</div>
            <p className="text-[10px] text-red-600/80">الديون التي خرجت اليوم</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-amber-50 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-amber-800 dark:text-amber-300">
              {t.debtCollectedToday}
              <Wallet className="w-4 h-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">${stats.debtPaidToday.toFixed(2)}</div>
            <p className="text-[10px] text-amber-600/80">ديون قام العملاء بسدادها اليوم</p>
          </CardContent>
        </Card>
      </div>

      {/* الصف السفلي: إحصائيات الشهر والمخزون */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {t.monthRevenue}
              <BarChart2 className="h-4 w-4 text-slate-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${stats.revenueMonth.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground">إجمالي مبيعات الشهر</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {t.monthProfit}
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${stats.profitMonth.toFixed(2)}</div>
            <p className="text-[10px] opacity-80">صافي أرباح الشهر</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Box className="h-4 w-4 text-slate-500" />
              {t.totalProducts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalProducts}</div>
            <p className="text-[10px] text-muted-foreground">{t.productCatalog}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-slate-500" />
              {t.todaySales}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalSalesToday}</div>
            <p className="text-[10px] text-muted-foreground">{t.salesRecorded}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
