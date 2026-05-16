
"use client"

import { useEffect, useState, useCallback } from "react"
import { db, Sale, DB_UPDATE_EVENT, getLocalDateString } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Sparkles, Loader2, RotateCcw, Trash2 } from "lucide-react"
import { summarizeDailySales } from "@/ai/flows/ai-sales-summary-flow"
import { useTranslation } from "@/context/language-context"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function ReportsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState("")
  const [sales, setSales] = useState<Sale[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)

  // تحميل المبيعات بناءً على التاريخ المختار
  const loadSales = useCallback(() => {
    const dateToLoad = selectedDate || getLocalDateString();
    const allSales = db.getSales()
    const filtered = allSales.filter(s => s.date === dateToLoad)
    setSales(filtered)
  }, [selectedDate])

  // ضبط التاريخ الابتدائي ليكون التاريخ المحلي عند تحميل المكون
  useEffect(() => {
    setSelectedDate(getLocalDateString());
  }, [])

  useEffect(() => {
    if (selectedDate) {
      loadSales()
    }
    
    const handleSync = () => loadSales();
    window.addEventListener(DB_UPDATE_EVENT, handleSync)
    window.addEventListener('storage', handleSync)
    
    return () => {
      window.removeEventListener(DB_UPDATE_EVENT, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [loadSales, selectedDate])

  const totalAmount = sales.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0)

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
      setSummary("Failed to generate AI summary.")
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleReturn = (saleId: string) => {
    if (confirm(t.confirmReturn)) {
      const success = db.returnSale(saleId);
      if (success) {
        toast({ title: t.success, description: t.saleReturned })
        loadSales();
      }
    }
  }

  const handleDelete = (saleId: string) => {
    if (confirm(t.deleteConfirm)) {
      const success = db.deleteSale(saleId);
      if (success) {
        toast({ title: t.success, description: t.success })
        loadSales();
      }
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
          <CalendarIcon className="h-4 w-4 text-primary ml-2" />
          <Input 
            type="date" 
            className="border-none shadow-none focus-visible:ring-0 w-[160px] bg-transparent"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setSummary(null)
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden bg-card">
            <CardHeader className="bg-primary text-white py-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {t.salesEntry} - {selectedDate}
                  </CardTitle>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">${totalAmount.toFixed(2)}</div>
                  <div className="text-xs opacity-80 uppercase font-semibold">{t.todayRevenue}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-none">
                    <TableHead>{t.time}</TableHead>
                    <TableHead>{t.product}</TableHead>
                    <TableHead>{t.customer}</TableHead>
                    <TableHead>{t.totalPrice}</TableHead>
                    <TableHead>{t.debt}</TableHead>
                    <TableHead className="text-right">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length > 0 ? (
                    sales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{sale.productName}</div>
                          <div className="text-[10px] text-muted-foreground">الكمية: {sale.quantitySold}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-slate-600">
                            {sale.customerName || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold">${sale.totalPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          {sale.debtAmount > 0 ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                              ${sale.debtAmount.toFixed(2)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleReturn(sale.id)} 
                            className="h-8 w-8 hover:bg-orange-50 text-orange-500"
                            title={t.returnSale}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(sale.id)} 
                            className="h-8 w-8 hover:bg-red-50 text-red-500"
                            title={t.remove}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
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
              {summary && (
                <div className="p-4 bg-card rounded-lg border border-accent/20 text-sm leading-relaxed">
                  {summary}
                </div>
              )}
              <Button 
                className="w-full" 
                disabled={sales.length === 0 || isSummarizing}
                onClick={handleAISummary}
              >
                {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {isSummarizing ? t.analyzing : t.summarizeDay}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
