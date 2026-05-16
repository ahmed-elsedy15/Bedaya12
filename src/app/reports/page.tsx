"use client"

import { useEffect, useState } from "react"
import { db, Sale } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Sparkles, Loader2, Download, RotateCcw } from "lucide-react"
import { summarizeDailySales } from "@/ai/flows/ai-sales-summary-flow"
import { useTranslation } from "@/context/language-context"
import { useToast } from "@/hooks/use-toast"

export default function ReportsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [sales, setSales] = useState<Sale[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)

  const loadSales = () => {
    const allSales = db.getSales()
    setSales(allSales.filter(s => s.date === selectedDate))
    setSummary(null)
  }

  useEffect(() => {
    loadSales()
  }, [selectedDate])

  const totalAmount = sales.reduce((sum, s) => sum + s.totalPrice, 0)

  const handleAISummary = async () => {
    if (sales.length === 0) return
    
    setIsSummarizing(true)
    try {
      const result = await summarizeDailySales({
        date: selectedDate,
        totalSalesAmount: totalAmount,
        soldProducts: sales.map(s => ({
          productName: s.productName,
          quantitySold: s.quantitySold,
          totalPrice: s.totalPrice
        }))
      })
      setSummary(result)
    } catch (error) {
      console.error(error)
      setSummary("Failed to generate AI summary.")
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleReturn = (saleId: string) => {
    if (confirm(t.confirmReturn)) {
      db.returnSale(saleId)
      toast({ title: t.success, description: t.saleReturned })
      loadSales()
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">{t.reports}</h1>
          <p className="text-muted-foreground">{t.welcome}</p>
        </div>
        
        <div className="flex items-center gap-3 bg-card p-2 rounded-lg border shadow-sm">
          <CalendarIcon className={`h-4 w-4 text-primary ${t.lang === 'ar' ? 'mr-2' : 'ml-2'}`} />
          <Label htmlFor="date" className="sr-only">Select Date</Label>
          <Input 
            type="date" 
            id="date" 
            className="border-none shadow-none focus-visible:ring-0 w-[160px] bg-transparent"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden bg-card">
            <CardHeader className="bg-primary text-white py-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t.salesEntry} - {new Date(selectedDate).toLocaleDateString(t.lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'long' })}</CardTitle>
                  <CardDescription className="text-primary-foreground/80">{t.detailedBreakdown}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">${totalAmount.toFixed(2)}</div>
                  <div className="text-xs opacity-80 uppercase tracking-wider font-semibold">{t.todayRevenue}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-none">
                    <TableHead>{t.time}</TableHead>
                    <TableHead>{t.product}</TableHead>
                    <TableHead>{t.qty}</TableHead>
                    <TableHead>{t.totalPrice}</TableHead>
                    <TableHead className={t.lang === 'ar' ? 'text-left' : 'text-right'}>{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length > 0 ? (
                    sales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-muted-foreground">{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell className="font-medium">{sale.productName}</TableCell>
                        <TableCell>{sale.quantitySold}</TableCell>
                        <TableCell className="font-semibold">${sale.totalPrice.toFixed(2)}</TableCell>
                        <TableCell className={t.lang === 'ar' ? 'text-left' : 'text-right'}>
                          <Button variant="ghost" size="icon" onClick={() => handleReturn(sale.id)} title={t.returnSale}>
                            <RotateCcw className="h-4 w-4 text-orange-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                        {t.noSales}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5 text-accent fill-accent" />
                {t.aiAnalysis}
              </CardTitle>
              <CardDescription>{t.generateSummary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary ? (
                <div className="p-4 bg-card rounded-lg border border-accent/20 text-sm leading-relaxed animate-in fade-in slide-in-from-top-2">
                  {summary}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  {sales.length > 0 ? t.aiPlaceholder : t.noData}
                </div>
              )}
              
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
                disabled={sales.length === 0 || isSummarizing}
                onClick={handleAISummary}
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className={`h-4 w-4 animate-spin ${t.lang === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    {t.analyzing}
                  </>
                ) : (
                  <>
                    <Sparkles className={`h-4 w-4 ${t.lang === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    {t.summarizeDay}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" disabled={sales.length === 0}>
            <Download className={`h-4 w-4 ${t.lang === 'ar' ? 'ml-2' : 'mr-2'}`} />
            {t.exportCsv}
          </Button>
        </div>
      </div>
    </div>
  )
}
