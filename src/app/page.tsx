
"use client"

import { useEffect, useState, useRef, useCallback, FormEvent } from "react"
import { db, getLocalDateString, DB_UPDATE_EVENT } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltipContent } from "@/components/ui/chart"
import * as RechartsPrimitive from "recharts"
import { DollarSign, BarChart2, Download, Upload, TrendingUp, ArrowUpRight, ShoppingBag, Box, Wallet } from "lucide-react"
import { useTranslation } from "@/context/language-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function Dashboard() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSalesToday: 0,
    revenueToday: 0,
    profitToday: 0,
    profitMonth: 0,
    revenueMonth: 0,
    revenueLastMonth: 0,
    profitLastMonth: 0,
    debtIssuedToday: 0,
    debtPaidToday: 0,
  })
  const [monthlyChartData, setMonthlyChartData] = useState<{ month: string; revenue: number; profit: number; expenses?: number }[]>([])
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [enteredPin, setEnteredPin] = useState("")
  const [pinError, setPinError] = useState(false)
  const pinInputRef = useRef<HTMLInputElement>(null)
  const DASHBOARD_PIN = "201499" // عدل هذا الرقم السري كما تريد

  const loadStats = useCallback(() => {
    const products = db.getProducts();
    const allSales = db.getSales();
    const allPayments = db.getPayments();
    const allExpenses = db.getExpenses();

    const todayStr = getLocalDateString();
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    // حساب الشهر الماضي
    const today = new Date();
    let lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonthMonth = lastMonthDate.getMonth() + 1; // شهر من 1 إلى 12
    const lastMonthPrefix = `${lastMonthYear}-${String(lastMonthMonth).padStart(2, '0')}`; // YYYY-MM

    // 1. إحصائيات اليوم (بناءً على مبيعات اليوم)
    const salesToday = allSales.filter(s => s.date === todayStr);
    const revenueToday = salesToday.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const profitToday = salesToday.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const debtIssuedToday = salesToday.reduce((sum, s) => sum + (Number(s.debtAmount) || 0), 0);

    // 2. الديون المسددة اليوم (من سجل المدفوعات الفعلي)
    const paymentsToday = allPayments.filter(p => p.date === todayStr);
    const debtPaidToday = paymentsToday.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 3. إحصائيات الشهر الحالي (تشمل اليوم الحالي)
    const salesMonth = allSales.filter(s => s.date && s.date.startsWith(currentMonthPrefix));
    const revenueMonthTotal = salesMonth.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const profitMonthTotal = salesMonth.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);

    // 4. إحصائيات الشهر الماضي
    const salesLastMonth = allSales.filter(s => s.date && s.date.startsWith(lastMonthPrefix));
    const revenueLastMonthTotal = salesLastMonth.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const profitLastMonthTotal = salesLastMonth.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);

    const lastMonthsCount = 6
    const monthlyData = Array.from({ length: lastMonthsCount }, (_, index) => {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - (lastMonthsCount - 1) + index, 1)
      const monthPrefix = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`
      const monthSales = allSales.filter(s => s.date?.startsWith(monthPrefix))
      const monthExpenses = allExpenses.filter(e => e.date?.startsWith(monthPrefix))
      return {
        month: monthDate.toLocaleString("ar-EG", { month: "short", year: "numeric" }),
        revenue: monthSales.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0),
        profit: monthSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0),
        expenses: monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
      }
    })

    setStats({
      totalProducts: products.length,
      totalSalesToday: salesToday.length,
      revenueToday: revenueToday,
      profitToday: profitToday,
      profitMonth: profitMonthTotal,
      revenueMonth: revenueMonthTotal,
      revenueLastMonth: revenueLastMonthTotal,
      profitLastMonth: profitLastMonthTotal,
      debtIssuedToday: debtIssuedToday,
      debtPaidToday: debtPaidToday,
    });

    setMonthlyChartData(monthlyData)
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

  useEffect(() => {
    if (!isUnlocked) {
      pinInputRef.current?.focus()
    }
  }, [isUnlocked])

  const handlePinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (enteredPin.trim() === DASHBOARD_PIN) {
      setIsUnlocked(true)
      setPinError(false)
      setEnteredPin("")
    } else {
      setPinError(true)
    }
  }

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
      className="relative p-8 min-h-screen bg-center bg-cover bg-no-repeat"
      style={{
        backgroundImage: "url('/king2.png')",
        backgroundSize: "450px",
        backgroundPosition: "bottom center"
      }}
    >
      <div className="relative">
        {!isUnlocked && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm">
            <div className="pointer-events-auto w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl">
              <h2 className="text-xl font-semibold text-white">ادخل الرقم السري</h2>
              <p className="mt-2 text-sm text-slate-400">هذا الداشبورد محمي برقم سري. لا يمكن رؤية البيانات إلا بعد إدخاله.</p>
              <form onSubmit={handlePinSubmit} className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-slate-200">الرقم السري</label>
                <input
                  ref={pinInputRef}
                  type="password"
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value)
                    if (pinError) setPinError(false)
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-white placeholder:text-slate-500 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                  placeholder="••••"
                />
                {pinError && <p className="text-sm text-red-400">الرقم غير صحيح، حاول مرة أخرى.</p>}
                <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full">دخول</Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => router.push('/sales-entry')}>سجل مبيعاتك الان</Button>

                </div>
              </form>
            </div>
          </div>
        )}
        <div className={`${!isUnlocked ? "blur-2xl" : ""} space-y-12`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 ">
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
      </div>

      {/* الصف العلوي: إحصائيات اليوم */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-10 mt-8">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-6">
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

        <Card className="border-none shadow-sm bg-slate-100 dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-slate-700 dark:text-slate-300">
              إيرادات الشهر الماضي
              <BarChart2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100">${stats.revenueLastMonth.toFixed(2)}</div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400">مبيعات الشهر السابق</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-indigo-50 dark:bg-indigo-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-indigo-700 dark:text-indigo-300">
              ربح الشهر الماضي
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">${stats.profitLastMonth.toFixed(2)}</div>
            <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">صافي الأرباح السابقة</p>
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

      <div className="rounded-xl bg-white/80 dark:bg-slate-900/10 shadow-sm p-4 backdrop-blur-sm mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">مخطط الشهور السابقة</h2>
            <p className="text-xs text-muted-foreground">قف على العمود لعرض المبلغ.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
                <span>إيرادات</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                <span>الربح</span>
              </div>
                <div className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                  <span>المصروفات</span>
                </div>
            </div>
          </div>
        </div>

        <ChartContainer
          config={{
            revenue: { label: "الإيرادات", color: "#2563eb" },
            profit: { label: "الربح", color: "#16a34a" },
            expenses: { label: "المصروفات", color: "#f97316" },
          }}
          className="mt-4 h-[380px] w-full bg-transparent"
          style={{ direction: "ltr" }}
        >
          <RechartsPrimitive.BarChart data={monthlyChartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }} barGap={12} barCategoryGap="20%">
            <RechartsPrimitive.XAxis dataKey="month" type="category" axisLine={true} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280f6" }} />
            <RechartsPrimitive.YAxis axisLine={true} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280f8" }} tickFormatter={(value) => `$${value.toLocaleString()}`} />
            {/* <RechartsPrimitive.Tooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value) => [`$${Number(value).toFixed(2)}`, ""]} />} /> */}
            <RechartsPrimitive.Bar dataKey="revenue" name="الإيرادات" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={75}>
              {monthlyChartData.map((entry, index) => (
                <RechartsPrimitive.Cell
                  key={`revenue-cell-${index}`}
                  fill={entry.revenue === 0 ? "#9ca3af" : "#2563eb"}
                />
              ))}
              <RechartsPrimitive.LabelList
                dataKey="revenue"
                position="top"
                formatter={(value: number) => (value ? `$${Number(value).toFixed(2)}` : "")}
                style={{ fill: "#2563eb", fontSize: 12, fontWeight: 600 }}
              />
            </RechartsPrimitive.Bar>
            <RechartsPrimitive.Bar dataKey="expenses" name="المصروفات" fill="#f97316" radius={[8, 8, 0, 0]} barSize={75}>
              {monthlyChartData.map((entry, index) => (
                <RechartsPrimitive.Cell
                  key={`expenses-cell-${index}`}
                  fill={entry.expenses === 0 ? "#9ca3af" : "#f97316"}
                />
              ))}
              <RechartsPrimitive.LabelList
                dataKey="expenses"
                position="top"
                formatter={(value: number) => (value ? `$${Number(value).toFixed(2)}` : "")}
                style={{ fill: "#f97316", fontSize: 12, fontWeight: 600 }}
              />
            </RechartsPrimitive.Bar>
            <RechartsPrimitive.Bar dataKey="profit" name="الربح" fill="#16a34a" radius={[8, 8, 0, 0]} barSize={75}>
              {monthlyChartData.map((entry, index) => (
                <RechartsPrimitive.Cell
                  key={`profit-cell-${index}`}
                  fill={entry.profit === 0 ? "#9ca3af" : "#16a34a"}
                />
              ))}
              <RechartsPrimitive.LabelList
                dataKey="profit"
                position="top"
                formatter={(value: number) => (value ? `$${Number(value).toFixed(2)}` : "")}
                style={{ fill: "#16a34a", fontSize: 12, fontWeight: 600 }}
              />
            </RechartsPrimitive.Bar>
          </RechartsPrimitive.BarChart>
        </ChartContainer>
      </div>
    </div>
  </div>
  )
}
