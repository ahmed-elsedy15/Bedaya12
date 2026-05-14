
"use client"

import { useEffect, useState } from "react"
import { db, Product, Sale, getLocalDateString, getSafeSaleProfit } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, TrendingUp, ShoppingBag, BarChart2, Calendar } from "lucide-react"

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSalesToday: 0,
    bestSeller: "None",
    revenueToday: 0,
    profitToday: 0,
    profitMonth: 0
  })

  useEffect(() => {
    const products = db.getProducts()
    const sales = db.getSales()
    
    const today = getLocalDateString();
    const currentMonthPrefix = today.substring(0, 7) // YYYY-MM
    
    // حساب إحصائيات اليوم
    const salesToday = sales.filter(s => s.date === today)
    const revenueToday = salesToday.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0)
    const profitToday = salesToday.reduce((sum, s) => sum + getSafeSaleProfit(s, products), 0)

    // حساب أرباح الشهر
    const salesMonth = sales.filter(s => s.date && s.date.startsWith(currentMonthPrefix))
    const profitMonth = salesMonth.reduce((sum, s) => sum + getSafeSaleProfit(s, products), 0)
    
    // حساب المنتج الأكثر مبيعاً
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
      revenueToday,
      profitToday,
      profitMonth,
      bestSeller
    })
  }, [])

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-headline font-bold text-primary">لوحة التحكم</h1>
        <p className="text-muted-foreground">أهلاً بك في SaleSphere. إليك ملخص أداء عملك اليوم.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي المنتجات</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">منتج في الكتالوج</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">مبيعات اليوم</CardTitle>
            <ShoppingBag className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSalesToday}</div>
            <p className="text-xs text-muted-foreground">عملية بيع مسجلة</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">إيرادات اليوم</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenueToday.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">إجمالي الدخل اليوم</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-green-50/50 dark:bg-green-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">صافي ربح اليوم</CardTitle>
            <BarChart2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">${stats.profitToday.toFixed(2)}</div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">ربح مبيعات اليوم</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">صافي ربح الشهر</CardTitle>
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">${stats.profitMonth.toFixed(2)}</div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">إجمالي أرباح هذا الشهر</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">الأكثر مبيعاً</CardTitle>
            <TrendingUp className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{stats.bestSeller}</div>
            <p className="text-xs text-muted-foreground">المنتج الأعلى طلباً</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
