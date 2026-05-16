
"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { db, getLocalDateString, calculateRealizedProfitFromAmount, DB_UPDATE_EVENT, Sale, Payment } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, BarChart2, HardDrive, Download, Upload, Wallet, TrendingUp } from "lucide-react"
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
    debtCollectedToday: 0
  })

  // دالة لحساب الإحصائيات (الإيراد والمكسب الحقيقي) لفترة معينة
  const calculatePeriodStats = useCallback((sales: Sale[], payments: Payment[], startDatePrefix: string) => {
    let revenue = 0;
    let profit = 0;
    let debtCollected = 0;

    // 1. حساب الإيراد والربح من مبيعات الفترة (الجزء الذي دفع كاش فقط)
    const periodSales = sales.filter(s => s.date && s.date.startsWith(startDatePrefix));
    periodSales.forEach(s => {
      const cashAmount = s.totalPrice - s.debtAmount; // المبلغ الذي دخل الدرج من هذه الفاتورة
      if (cashAmount > 0) {
        revenue += cashAmount;
        profit += calculateRealizedProfitFromAmount(s, cashAmount);
      }
    });

    // 2. حساب الإيراد والربح من تحصيلات الديون التي تمت في هذه الفترة
    const periodPayments = payments.filter(p => p.date && p.date.startsWith(startDatePrefix));
    // نحتاج ترتيب الفواتير زمنياً لحساب الربح بنظام (الأقدم يسدد أولاً)
    const allSales = [...sales].sort((a, b) => a.timestamp - b.timestamp);

    periodPayments.forEach(payment => {
      debtCollected += Number(payment.amount);
      revenue += Number(payment.amount);
      
      // لتحديد "المكسب" من هذا التحصيل، نوزعه على فواتير العميل التي بها دين
      let remainingPayment = Number(payment.amount);
      const customerDebtSales = allSales.filter(s => s.customerId === payment.customerId && s.debtAmount > 0);
      
      for (const sale of customerDebtSales) {
        if (remainingPayment <= 0) break;
        const amountToApply = Math.min(remainingPayment, sale.debtAmount);
        profit += calculateRealizedProfitFromAmount(sale, amountToApply);
        remainingPayment -= amountToApply;
      }
      
      // إذا كان التحصيل زائداً عن كل الديون (حالة نادرة)، نعتبره ربحاً صافياً
      if (remainingPayment > 0) {
        profit += remainingPayment;
      }
    });

    return { revenue, profit, debtCollected };
  }, []);

  const loadStats = useCallback(() => {
    const products = db.getProducts();
    const sales = db.getSales();
    const payments = db.getPayments();
    
    const today = getLocalDateString();
    const currentMonthPrefix = today.substring(0, 7);
    
    const todayData = calculatePeriodStats(sales, payments, today);
    const monthData = calculatePeriodStats(sales, payments, currentMonthPrefix);

    setStats({
      totalProducts: products.length,
      totalSalesToday: sales.filter(s => s.date === today).length,
      revenueToday: todayData.revenue,
      profitToday: todayData.profit,
      profitMonth: monthData.profit,
      revenueMonth: monthData.revenue,
      debtCollectedToday: todayData.debtCollected
    });
  }, [calculatePeriodStats]);

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
        <Card className="border-none shadow-md bg-blue-50 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {t.todayRevenue}
              <DollarSign className="w-4 h-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">${stats.revenueToday.toFixed(2)}</div>
            <p className="text-[10px] text-blue-600/80">إجمالي "الفلوس" اللي دخلت اليوم</p>
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
            <p className="text-[10px] text-green-600/80">"المكسب" الحقيقي من فلوس اليوم</p>
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
            <p className="text-[10px] text-amber-600/80">إجمالي ما سدده العملاء اليوم</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-purple-50 dark:bg-purple-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {t.monthProfit}
              <BarChart2 className="w-4 h-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">${stats.profitMonth.toFixed(2)}</div>
            <p className="text-[10px] text-purple-600/80">إجمالي "المكسب" المحقق هذا الشهر</p>
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
            <CardTitle className="text-sm font-medium">{t.monthRevenue}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">${stats.revenueMonth.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">إجمالي "الفلوس" اللي دخلت هذا الشهر</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
