"use client"

import { useEffect, useState } from "react"
import { db, Sale } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Sparkles, Loader2, Download } from "lucide-react"
import { summarizeDailySales } from "@/ai/flows/ai-sales-summary-flow"

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [sales, setSales] = useState<Sale[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)

  useEffect(() => {
    const allSales = db.getSales()
    setSales(allSales.filter(s => s.date === selectedDate))
    setSummary(null)
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
      setSummary("Failed to generate AI summary. Please try again.")
    } finally {
      setIsSummarizing(false)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Daily Reports</h1>
          <p className="text-muted-foreground">Track performance and analyze sales data.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
          <CalendarIcon className="h-4 w-4 text-primary ml-2" />
          <Label htmlFor="date" className="sr-only">Select Date</Label>
          <Input 
            type="date" 
            id="date" 
            className="border-none shadow-none focus-visible:ring-0 w-[160px]"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-primary text-white py-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Sales for {new Date(selectedDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</CardTitle>
                  <CardDescription className="text-primary-foreground/80">Detailed breakdown of transactions.</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">${totalAmount.toFixed(2)}</div>
                  <div className="text-xs opacity-80 uppercase tracking-wider font-semibold">Daily Revenue</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-none">
                    <TableHead>Time</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">Total Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length > 0 ? (
                    sales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-muted-foreground">{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell className="font-medium">{sale.productName}</TableCell>
                        <TableCell>{sale.quantitySold}</TableCell>
                        <TableCell className="text-right font-semibold">${sale.totalPrice.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                        No sales recorded for this date.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5 text-accent fill-accent" />
                AI Analysis Tool
              </CardTitle>
              <CardDescription>Generate a smart summary of today's performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary ? (
                <div className="p-4 bg-white rounded-lg border border-accent/20 text-sm leading-relaxed text-slate-700 animate-in fade-in slide-in-from-top-2">
                  {summary}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  {sales.length > 0 ? "Click below to analyze today's sales." : "No data available to analyze."}
                </div>
              )}
              
              <Button 
                className="w-full bg-primary hover:bg-primary/90" 
                disabled={sales.length === 0 || isSummarizing}
                onClick={handleAISummary}
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Sales...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Summarize Day
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" disabled={sales.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV Report
          </Button>
        </div>
      </div>
    </div>
  )
}
