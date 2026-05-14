"use client"

import { useEffect, useState } from "react"
import { db, Product, Sale } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, TrendingUp, ShoppingBag, BarChart2 } from "lucide-react"

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSalesToday: 0,
    bestSeller: "None",
    revenueToday: 0,
    profitToday: 0
  })

  useEffect(() => {
    const products = db.getProducts()
    const sales = db.getSales()
    const today = new Date().toISOString().split('T')[0]
    
    const salesToday = sales.filter(s => s.date === today)
    const revenueToday = salesToday.reduce((sum, s) => sum + s.totalPrice, 0)
    const profitToday = salesToday.reduce((sum, s) => sum + (s.profit || 0), 0)
    
    // Calculate best seller
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
      bestSeller
    })
  }, [])

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome back to SaleSphere. Here's your business at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">In active catalog</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Sales Today</CardTitle>
            <ShoppingBag className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSalesToday}</div>
            <p className="text-xs text-muted-foreground">Transactions recorded</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenueToday.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total earnings today</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-green-700">Profit Today</CardTitle>
            <BarChart2 className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">${stats.profitToday.toFixed(2)}</div>
            <p className="text-xs text-green-600/80">Net profit margin</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Best Seller</CardTitle>
            <TrendingUp className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{stats.bestSeller}</div>
            <p className="text-xs text-muted-foreground">All-time top product</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
