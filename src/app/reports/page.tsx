
"use client"

import { useEffect, useState, useCallback } from "react"
import { db, Sale, DB_UPDATE_EVENT, getLocalDateString } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, RotateCcw } from "lucide-react"
import { useTranslation } from "@/context/language-context"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ReportsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState("")
  const [sales, setSales] = useState<Sale[]>([])

  // States for confirmation dialogs
  const [saleToReturn, setSaleToReturn] = useState<string | null>(null)

  const loadSales = useCallback(() => {
    const dateToLoad = selectedDate || getLocalDateString();
    const allSales = db.getSales()
    const filtered = allSales.filter(s => s.date === dateToLoad)
    setSales(filtered)
  }, [selectedDate])

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

  const confirmReturn = () => {
    if (!saleToReturn) return;
    const success = db.returnSale(saleToReturn);
    if (success) {
      toast({ title: t.success, description: t.saleReturned })
      loadSales();
    }
    setSaleToReturn(null);
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
            }}
          />
        </div>
      </div>

      <div className="space-y-6">
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
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setSaleToReturn(sale.id)} 
                          className="h-8 w-8 hover:bg-orange-50 text-orange-500"
                          title={t.returnSale}
                        >
                          <RotateCcw className="h-4 w-4" />
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

      {/* Return Sale Confirmation Dialog */}
      <AlertDialog open={!!saleToReturn} onOpenChange={(open) => !open && setSaleToReturn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmReturn}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmReturn}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToReturn(null)}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReturn} className="bg-orange-600 hover:bg-orange-700">
              {t.save}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
