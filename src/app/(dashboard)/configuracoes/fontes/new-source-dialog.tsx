"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Tables } from "@/types/database.types";
import { SourceForm } from "./source-form";

export function NewSourceDialog({ accounts }: { accounts: Tables<"meta_ad_accounts">[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nova fonte
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-popover max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova fonte de leads</DialogTitle>
        </DialogHeader>
        <SourceForm accounts={accounts} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
