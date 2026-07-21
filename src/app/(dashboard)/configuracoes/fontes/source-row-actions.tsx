"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/types/database.types";
import { SourceForm } from "./source-form";
import { deleteSource } from "./actions";

interface SourceRowActionsProps {
  source: Tables<"lead_sources">;
  accounts: Tables<"meta_ad_accounts">[];
}

export function SourceRowActions({ source, accounts }: SourceRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteSource(source.id);
      if (result?.success) toast.success(result.success);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Editar"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-4" />
        </Button>
        <DialogContent className="glass-popover max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar fonte</DialogTitle>
          </DialogHeader>
          <SourceForm
            source={source}
            accounts={accounts}
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            aria-label="Excluir"
            disabled={isDeleting}
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="glass-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &quot;{source.label}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove a fonte e todos os leads importados por ela. Não pode
              ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
