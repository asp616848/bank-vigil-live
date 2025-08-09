import React, { useEffect, useState } from "react";
import { Card as UiCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const mask = (n: string) => `${n.slice(0, 4)} •••• •••• ${n.slice(-4)}`;

const Cards: React.FC = () => {
  const [locked, setLocked] = useState<{ debit: boolean; credit: boolean }>({ debit: false, credit: true });

  useEffect(() => {
    document.title = "My Cards — Bank of India";
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">My Cards</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <UiCard className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm">Debit Card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl p-5 bg-gradient-to-br from-primary/90 to-accent text-primary-foreground shadow-lg">
              <div className="text-sm opacity-80">Bank of India</div>
              <div className="text-xl font-mono tracking-widest mt-6">{mask("4219123412342190")}</div>
              <div className="flex justify-between mt-6 text-xs opacity-90">
                <span>VALID THRU 12/28</span>
                <span>VISA</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">Lock Card</div>
              <Switch checked={locked.debit} onCheckedChange={(v) => setLocked((s) => ({ ...s, debit: v }))} />
            </div>
            <Button variant="outline" className="hover-scale">Manage</Button>
          </CardContent>
        </UiCard>

        <UiCard className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm">Credit Card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl p-5 bg-gradient-to-br from-secondary to-accent text-secondary-foreground shadow-lg">
              <div className="text-sm opacity-80">Bank of India</div>
              <div className="text-xl font-mono tracking-widest mt-6">{mask("5521123412341234")}</div>
              <div className="flex justify-between mt-6 text-xs opacity-90">
                <span>VALID THRU 05/29</span>
                <span>MASTERCARD</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">Lock Card</div>
              <Switch checked={locked.credit} onCheckedChange={(v) => setLocked((s) => ({ ...s, credit: v }))} />
            </div>
            <Button variant="outline" className="hover-scale">Manage</Button>
          </CardContent>
        </UiCard>
      </div>
    </div>
  );
};

export default Cards;
