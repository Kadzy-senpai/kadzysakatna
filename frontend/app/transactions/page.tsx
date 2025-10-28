"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MobileContainer } from "@/components/mobile-container"
import { BottomNav } from "@/components/bottom-nav"
import { DollarSign, CreditCard, Wallet, TrendingUp } from "lucide-react"
import { get as apiGet, post as apiPost } from "@/lib/api"
import { getStoredUser } from "@/lib/auth"

type BackendTransaction = {
  transaction_id: string
  booking_id: string
  user_id: string
  driver_id: string
  payment_mode: string
  payment_status: string
  amount: number
  created_at: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<BackendTransaction[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const user = getStoredUser()

  useEffect(() => {
    if (!user?.user_id) return
    let mounted = true
    setLoading(true)
    setError(null)
    apiGet(`/transactions/user/${user.user_id}`)
      .then((res) => {
        if (!mounted) return
        // backend returns array of transactions
        setTransactions(Array.isArray(res) ? res : [])
      })
      .catch((err) => {
        console.error("fetch transactions", err)
        if (!mounted) return
        setError((err as any)?.message || JSON.stringify(err))
        setTransactions([])
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [user?.user_id])

  const todayTotal = useMemo(() => {
    if (!transactions) return 0
    const todayStr = new Date().toISOString().slice(0, 10)
    return transactions
      .filter((t) => {
        const d = (t.created_at || "").slice(0, 10)
        return d === todayStr && (t.payment_status === "success" || t.payment_status === "completed")
      })
      .reduce((s, t) => s + (t.amount || 0), 0)
  }, [transactions])

  async function confirmCash(txId: string) {
    try {
      const res = await apiPost(`/transactions/${txId}/confirm`, {})
      // update local list
      setTransactions((prev) => (prev ? prev.map((t) => (t.transaction_id === txId ? res : t)) : prev))
    } catch (err) {
      alert("Failed to confirm payment: " + ((err as any)?.message || JSON.stringify(err)))
    }
  }

  if (!user?.user_id) {
    return (
      <MobileContainer>
        <header className="bg-primary text-primary-foreground p-6 shadow-md">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-primary-foreground/90 mt-1">Please sign in to view your transactions</p>
        </header>
        <div className="p-6">Please log in to continue.</div>
      </MobileContainer>
    )
  }

  const isPassenger = user?.role === "passenger"

  return (
    <MobileContainer>
      <header className="bg-primary text-primary-foreground p-6 shadow-md">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-primary-foreground/90 mt-1">Your payment history</p>
      </header>

      <div className="p-6 space-y-6">
        <Card className="shadow-lg bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-foreground/80 text-sm font-medium mb-1">{isPassenger ? "Today's Total Expenses" : "Today's Total Earnings"}</p>
                <p className="text-3xl font-bold">₱{todayTotal}</p>
              </div>
              <div className="p-3 bg-secondary-foreground/10 rounded-full">
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">Transaction History</h2>
          <p className="text-sm text-muted-foreground -mt-2">Transaction records are permanent and cannot be deleted</p>

          {loading && <div className="py-6">Loading transactions...</div>}
          {error && <div className="text-destructive">Error: {error}</div>}
          {!loading && transactions && transactions.length === 0 && (
            <div className="py-6 text-muted-foreground">No transactions found.</div>
          )}

          {transactions?.map((transaction) => {
            const timestamp = transaction.created_at ? new Date(transaction.created_at).toLocaleString() : "-"
            const isCash = (transaction.payment_mode || "").toLowerCase() === "cash"
            const completed = (transaction.payment_status || "").toLowerCase() === "success" || (transaction.payment_status || "").toLowerCase() === "completed"

            return (
              <Card key={transaction.transaction_id} className="shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-mono">{transaction.transaction_id}</CardTitle>
                    <Badge variant={completed ? "default" : "secondary"} className={completed ? "bg-secondary" : ""}>
                      {transaction.payment_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {isCash ? <Wallet className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                      <span>{transaction.payment_mode}</span>
                    </div>
                    <span className="text-muted-foreground">{timestamp}</span>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Amount</span>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-5 w-5 text-secondary" />
                        <span className="text-xl font-bold text-foreground">₱{transaction.amount}</span>
                      </div>
                    </div>

                    {isCash && !completed && (
                      <div className="mt-3">
                        <button
                          onClick={() => confirmCash(transaction.transaction_id)}
                          className="px-3 py-2 bg-primary text-white rounded-md"
                        >
                          Confirm cash payment
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <BottomNav />
    </MobileContainer>
  )
}
