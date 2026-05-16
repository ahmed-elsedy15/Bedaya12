"use client"

import { useEffect, useState, useRef } from "react"
import { db, getLocalDateString, getSafeSaleProfit } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, TrendingUp, ShoppingBag, BarChart2, Calendar, CreditCard, HardDrive, Info, Download, Upload } from "lucide-react"
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
    revenueMonth: 0
  })

  const loadStats = () => {
    const products = db.getProducts()
    const sales = db.getSales()
    
    const today = getLocalDateString();
    const currentMonthPrefix = today.substring(0, 7)
    
    const salesToday = sales.filter(s => s.date === today)
    const revenueToday = salesToday.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0)
    const profitToday = salesToday.reduce((sum, s) => sum + getSafeSaleProfit(s, products), 0)

    const salesMonth = sales.filter(s => s.date && s.date.startsWith(currentMonthPrefix))
    const profitMonth = salesMonth.reduce((sum, s) => sum + getSafeSaleProfit(s, products), 0)
    const revenueMonth = salesMonth.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0)
    
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
      revenueMonth,
      bestSeller
    })
  }

  const handleExportData = () => {
    const products = db.getProducts();
    const sales = db.getSales();
    const customers = db.getCustomers();
    
    const data = {
      products,
      sales,
      customers,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salesphere_backup_${getLocalDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.products && Array.isArray(data.products)) {
          db.saveProducts(data.products);
        }
        if (data.sales && Array.isArray(data.sales)) {
          db.saveSales(data.sales);
        }
        if (data.customers && Array.isArray(data.customers)) {
          db.saveCustomers(data.customers);
        }

        toast({
          title: t.success,
          description: t.importSuccess,
        });
        loadStats();
      } catch (err) {
        console.error("Import error:", err);
        toast({
          title: t.error,
          description: t.importError,
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    loadStats()
    
    window.addEventListener('storage', loadStats);
    return () => {
      window.removeEventListener('storage', loadStats);
    };
  }, [])

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold text-primary">{t.dashboard}</h1>
          <p className="text-muted-foreground">{t.welcome}</p>
        </div>
        
        <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-900/10 max-w-md">
          <CardContent className="p-4 flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400">{t.storageStatus}</p>
              <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">{t.localOnly}</p>
            </div>
            <div className="flex gap-1 ml-auto">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleImportData}
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => fileInputRef.current?.click()} 
                title={t.importData}
              >
                <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleExportData} 
                title={t.exportData}
              >
                <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </Button>
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
            <div className="text-2xl font-bold">${stats.revenueToday.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{t.dailyIncome}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-green-50/50 dark:bg-green-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">{t.todayProfit}</CardTitle>
            <BarChart2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">${stats.profitToday.toFixed(2)}</div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">{t.salesProfit}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">{t.monthRevenue}</CardTitle>
            <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">${stats.revenueMonth.toFixed(2)}</div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">{t.totalMonthRevenue}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">{t.monthProfit}</CardTitle>
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">${stats.profitMonth.toFixed(2)}</div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">{t.totalMonthProfit}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{t.bestSeller}</CardTitle>
            <TrendingUp className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{stats.bestSeller === "None" ? (t.lang === "ar" ? "لا يوجد" : "None") : stats.bestSeller}</div>
            <p className="text-xs text-muted-foreground">{t.topProduct}</p>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/40 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-bold">{t.storageStatus}: {t.localOnly}</p>
          <p className="opacity-80">{t.storageWarning}</p>
        </div>
      </div>
    </div>
  )
}
