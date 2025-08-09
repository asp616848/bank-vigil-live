import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = { date: string; description: string; amount: number };

const base: Row[] = [
  { date: "2025-07-28", description: "UPI: Coffee shop", amount: -180 },
  { date: "2025-07-29", description: "UPI: Food delivery", amount: -620 },
  { date: "2025-08-01", description: "Salary credit", amount: 85000 },
  { date: "2025-08-03", description: "Electricity bill", amount: -2140 },
  { date: "2025-08-05", description: "Movie tickets", amount: -780 },
];

function toCSV(rows: Row[]) {
  const header = ["Date", "Description", "Amount"].join(",");
  const lines = rows.map((r) => [r.date, r.description, r.amount].join(","));
  return [header, ...lines].join("\n");
}

const Statements: React.FC = () => {
  const [sortKey, setSortKey] = useState<keyof Row>("date");
  const [asc, setAsc] = useState<boolean>(false);

  const rows = useMemo(() => {
    return [...base].sort((a, b) => {
      const x = a[sortKey];
      const y = b[sortKey];
      const dir = asc ? 1 : -1;
      if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
      return ("" + x).localeCompare("" + y) * dir;
    });
  }, [sortKey, asc]);

  const downloadCSV = () => {
    const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "statements.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Passbook / Statements</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Sortable columns</div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={downloadCSV}>Download CSV</Button>
              <Button variant="outline" disabled>Download PDF</Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-3 cursor-pointer" onClick={() => { setAsc(sortKey === 'date' ? !asc : false); setSortKey('date'); }}>Date</th>
                  <th className="text-left p-3 cursor-pointer" onClick={() => { setAsc(sortKey === 'description' ? !asc : true); setSortKey('description'); }}>Description</th>
                  <th className="text-right p-3 cursor-pointer" onClick={() => { setAsc(sortKey === 'amount' ? !asc : false); setSortKey('amount'); }}>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="p-3">{r.date}</td>
                    <td className="p-3">{r.description}</td>
                    <td className={`p-3 text-right ${r.amount < 0 ? 'text-destructive' : 'text-emerald-500'}`}>{r.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Statements;
