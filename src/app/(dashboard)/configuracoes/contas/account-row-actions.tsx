"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plug, Trash2 } from "lucide-react";
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
import { AccountForm } from "./account-form";
import { deleteAccount, testConnection } from "./actions";

export function AccountRowActions({
  account,
}: {
  account: Tables<"meta_ad_accounts">;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [isTesting, startTest] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  function handleTest() {
    startTest(async () => {
      const result = await testConnection(account.id);
      if (result?.success) toast.success(result.success);
      if (result?.error) toast.error(result.error);
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteAccount(account.id);
      if (result?.success) toast.success(result.success);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        aria-label="Testar conexão"
        disabled={isTesting}
        onClick={handleTest}
      >
        {isTesting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plug className="size-4" />
        )}
      </Button>

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
            <DialogTitle>Editar conta</DialogTitle>
          </DialogHeader>
          <AccountForm account={account} onSuccess={() => setEditOpen(false)} />
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
            <AlertDialogTitle>Excluir &quot;{account.label}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove a conta e o vínculo com o token cifrado. Ações e
              insights já sincronizados que referenciam essa conta deixam de
              ser acessíveis. Não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
