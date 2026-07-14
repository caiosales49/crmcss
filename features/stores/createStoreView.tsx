"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/authProvider";
import { useStore } from "@/contexts/storeProvider";

export function CreateStoreView() {
  const router = useRouter();
  const { logout } = useAuth();
  const store = useStore();
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Informe o nome da loja.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await store.createOwnedStore({ name: trimmedName, document });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a loja.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <CardTitle>Criar primeira loja</CardTitle>
          <p className="text-sm text-muted-foreground">
            Para continuar, cadastre a loja que será usada nesta conta.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={submit}>
            <Input
              placeholder="Nome da loja"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              placeholder="CPF ou CNPJ (opcional)"
              value={document}
              onChange={(event) => setDocument(event.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={saving}>
              Criar loja e continuar
            </Button>
            <Button type="button" variant="secondary" onClick={() => void logout()}>
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
