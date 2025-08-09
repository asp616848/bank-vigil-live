import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PayBill: React.FC = () => {
  const [sending, setSending] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    document.title = "Pay Bill — Bank of India";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    toast({ title: "Bill paid", description: "Your bill payment has been processed." });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Pay Bill</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Biller Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Biller</Label>
              <Select defaultValue="electricity">
                <SelectTrigger>
                  <SelectValue placeholder="Select biller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electricity">Electricity</SelectItem>
                  <SelectItem value="gas">Gas</SelectItem>
                  <SelectItem value="broadband">Broadband</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer ID / Account</Label>
              <Input placeholder="Enter account / customer ID" required />
            </div>
            <div className="space-y-2">
              <Label>Amount (INR)</Label>
              <Input type="number" min={1} step={1} placeholder="1500" required />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start font-normal", !dueDate && "text-muted-foreground")}> 
                    {dueDate ? dueDate.toDateString() : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={sending} className="hover-scale">
                {sending ? "Processing..." : "Pay Now"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayBill;
