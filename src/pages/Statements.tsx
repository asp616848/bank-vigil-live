import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { useNavigate } from "react-router-dom";

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
	const [fromDate, setFromDate] = useState<Date | undefined>();
	const [toDate, setToDate] = useState<Date | undefined>();
	const [type, setType] = useState<"all" | "credit" | "debit">("all");
	const { query } = useSearch();
	const navigate = useNavigate();

	const rows = useMemo(() => {
		const filtered = base.filter((r) => {
			const d = new Date(r.date + "T00:00:00");
			if (fromDate && d < new Date(fromDate.toDateString())) return false;
			if (toDate && d > new Date(toDate.toDateString())) return false;
			if (type === "credit" && r.amount <= 0) return false;
			if (type === "debit" && r.amount >= 0) return false;
			const q = query.trim().toLowerCase();
			if (
				q &&
				!(r.description.toLowerCase().includes(q) || r.date.includes(q) || String(r.amount).includes(q))
			)
				return false;
			return true;
		});
		return filtered.sort((a, b) => {
			const x = a[sortKey];
			const y = b[sortKey];
			const dir = asc ? 1 : -1;
			if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
			return ("" + x).localeCompare("" + y) * dir;
		});
	}, [sortKey, asc, fromDate, toDate, type, query]);

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
			<header className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">Passbook / Statements</h1>
				<Button variant="ghost" onClick={() => navigate("/app/dashboard")}>
					Back to Dashboard
				</Button>
			</header>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Transactions</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-3">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="flex flex-col gap-1">
								<Label className="text-xs">From</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"justify-start font-normal",
												!fromDate && "text-muted-foreground"
											)}
										>
											{fromDate ? fromDate.toDateString() : <span>Pick a date</span>}
											<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={fromDate}
											onSelect={setFromDate}
											initialFocus
											className={cn("p-3 pointer-events-auto")}
										/>
									</PopoverContent>
								</Popover>
							</div>
							<div className="flex flex-col gap-1">
								<Label className="text-xs">To</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"justify-start font-normal",
												!toDate && "text-muted-foreground"
											)}
										>
											{toDate ? toDate.toDateString() : <span>Pick a date</span>}
											<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={toDate}
											onSelect={setToDate}
											initialFocus
											className={cn("p-3 pointer-events-auto")}
										/>
									</PopoverContent>
								</Popover>
							</div>
							<div className="flex flex-col gap-1">
								<Label className="text-xs">Type</Label>
								<Select value={type} onValueChange={(v) => setType(v as any)}>
									<SelectTrigger>
										<SelectValue placeholder="Filter type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All</SelectItem>
										<SelectItem value="credit">Credits</SelectItem>
										<SelectItem value="debit">Debits</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="flex gap-2">
							<Button variant="secondary" onClick={downloadCSV}>
								Download CSV
							</Button>
							<Button variant="outline" disabled>
								Download PDF
							</Button>
						</div>
					</div>
					<div className="overflow-x-auto rounded-md border">
						<table className="w-full text-sm">
							<thead className="bg-muted/40">
								<tr>
									<th
										className="text-left p-3 cursor-pointer"
										onClick={() => {
											setAsc(sortKey === "date" ? !asc : false);
											setSortKey("date");
										}}
									>
										Date
									</th>
									<th
										className="text-left p-3 cursor-pointer"
										onClick={() => {
											setAsc(sortKey === "description" ? !asc : true);
											setSortKey("description");
										}}
									>
										Description
									</th>
									<th
										className="text-right p-3 cursor-pointer"
										onClick={() => {
											setAsc(sortKey === "amount" ? !asc : false);
											setSortKey("amount");
										}}
									>
										Amount (INR)
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((r, i) => (
									<tr key={i} className="hover:bg-muted/30">
										<td className="p-3">{r.date}</td>
										<td className="p-3">{r.description}</td>
										<td
											className={`p-3 text-right ${
												r.amount < 0 ? "text-destructive" : "text-emerald-500"
											}`}
										>
											{r.amount}
										</td>
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
