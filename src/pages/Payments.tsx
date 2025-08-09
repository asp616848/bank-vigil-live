import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

const Payments: React.FC = () => {
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1800));
    setSending(false);
    toast({ title: "Payment sent", description: "Funds transferred successfully." });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Payments</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Send Money</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>From Account</Label>
              <Select defaultValue="savings">
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings • **** 2190</SelectItem>
                  <SelectItem value="current">Current • **** 9981</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To Account</Label>
              <Input placeholder="Account number / UPI ID" required />
            </div>
            <div className="space-y-2">
              <Label>Amount (INR)</Label>
              <Input type="number" min={1} step={1} placeholder="1000" required />
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Input placeholder="Payment note" />
            </div>
            <div className="md:col-span-2">
              <motion.div className="inline-block" animate={{ scale: sending ? [1, 0.98, 1] : 1 }} transition={{ repeat: sending ? Infinity : 0, duration: 0.8 }}>
                <Button type="submit" disabled={sending} className="hover-scale">
                  {sending ? "Sending..." : "Send"}
                </Button>
              </motion.div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
