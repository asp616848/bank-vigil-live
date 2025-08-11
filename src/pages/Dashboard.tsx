import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowDownRight, ArrowUpRight, CreditCard, FileText, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { useSearch } from "@/hooks/useSearch";
import FingerprintDisplay from "@/components/FingerprintDisplay";

function currency(n: number) {
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { query } = useSearch();

  const [transactions, setTransactions] = useState<{ id: number; type: string; desc: string; amount: number; date: string }[]>([]);
  useEffect(() => {
    let active = true;
    fetch("/transactions.json")
      .then((r) => r.json())
      .then((rows: { date: string; description: string; amount: number }[]) => {
        if (!active) return;
        const mapped = (rows || []).slice(-5).map((r, idx) => ({
          id: idx + 1,
          type: r.amount >= 0 ? "Credit" : "Debit",
          desc: r.description,
          amount: r.amount,
          date: r.date,
        }));
        setTransactions(mapped);
      })
      .catch(() => setTransactions([]));
    return () => {
      active = false;
    };
  }, []);

  const balanceSeries = useMemo(() => {
    const data: { date: string; balance: number }[] = [];
    let balance = 125000;
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      balance += Math.sin(i / 3) * 300 - 100;
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      data.push({ date: label, balance });
    }
    return data;
  }, []);
  useEffect(() => {
    document.title = "Home Dashboard — Bank of India";
  }, []);

  const filteredTx = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => [t.desc, t.type, t.date, String(t.amount)].some((f) => f.toLowerCase().includes(q)));
  }, [query, transactions]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Home Dashboard</h1>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Account Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currency(135420)}</div>
            <p className="text-xs text-muted-foreground">Savings • **** 2190</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Monthly Spends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currency(32490)}</div>
            <p className="text-xs text-muted-foreground">vs last month +6%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2,140 pts</div>
            <p className="text-xs text-muted-foreground">Redeem for vouchers</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button className="hover-scale" onClick={() => navigate("/app/transfers")}>
            <Send className="mr-2 h-4 w-4" /> Transfer Money
          </Button>
          <Button variant="secondary" className="hover-scale" onClick={() => navigate("/app/pay-bill")}>
            <CreditCard className="mr-2 h-4 w-4" /> Pay Bill
          </Button>
          <Button variant="outline" className="hover-scale" onClick={() => navigate("/app/statements")}>
            <FileText className="mr-2 h-4 w-4" /> View Statements
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Recent Transactions</h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Details</th>
                <th className="text-left p-3">Type</th>
                <th className="text-right p-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="p-3">{t.date}</td>
                  <td className="p-3">{t.desc}</td>
                  <td className="p-3">{t.type}</td>
                  <td className={`p-3 text-right font-medium ${t.amount < 0 ? "text-destructive" : "text-emerald-500"}`}>
                    {t.amount < 0 ? <ArrowDownRight className="inline h-4 w-4 mr-1" /> : <ArrowUpRight className="inline h-4 w-4 mr-1" />}
                    {currency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Balance Trend (Last 30 Days)</h2>
        <div className="h-64 w-full rounded-md border">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={balanceSeries} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Area dataKey="balance" stroke="hsl(var(--primary))" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Security & Device Information</h2>
        <FingerprintDisplay />
      </section>
    </div>
  );
};

export default Dashboard;
