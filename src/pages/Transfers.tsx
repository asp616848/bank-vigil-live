import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const Transfers: React.FC = () => {
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = "Transfers — Bank of India";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1400));
    setSending(false);
    toast({ title: "Transfer submitted", description: "Funds will arrive shortly." });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Transfers</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Transfer Money</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Recipient Account</Label>
              <Input placeholder="Account number" required />
            </div>
            <div className="space-y-2">
              <Label>IFSC</Label>
              <Input placeholder="IFSC code" required />
            </div>
            <div className="space-y-2">
              <Label>Amount (INR)</Label>
              <Input type="number" min={1} step={1} placeholder="5000" required />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input placeholder="Optional note" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={sending} className="hover-scale">
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transfers;
