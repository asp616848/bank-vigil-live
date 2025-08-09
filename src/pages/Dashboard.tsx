import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowDownRight, ArrowUpRight, CreditCard, FileText, Send } from "lucide-react";

const transactions = [
  { id: 1, type: "Debit", desc: "UPI Payment - Grocery", amount: -1250.5, date: "2025-08-01" },
  { id: 2, type: "Credit", desc: "Salary - August", amount: 85000, date: "2025-08-01" },
  { id: 3, type: "Debit", desc: "Electricity Bill", amount: -2140, date: "2025-08-03" },
  { id: 4, type: "Debit", desc: "Movie Tickets", amount: -780, date: "2025-08-05" },
];

const currency = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const Dashboard: React.FC = () => {
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
          <Button className="hover-scale"> <Send className="mr-2 h-4 w-4" /> Transfer Money</Button>
          <Button variant="secondary" className="hover-scale"> <CreditCard className="mr-2 h-4 w-4" /> Pay Bill</Button>
          <Button variant="outline" className="hover-scale"> <FileText className="mr-2 h-4 w-4" /> View Statements</Button>
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
              {transactions.map((t) => (
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
    </div>
  );
};

export default Dashboard;
