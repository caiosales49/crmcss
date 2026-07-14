"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/authProvider";

export default function SuspendedAccountPage() {
  const { logout } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg p-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Acesso suspenso</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Identificamos uma pendência relacionada ao uso da plataforma.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Fique em dia com a plataforma para recuperar o acesso à sua conta.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Entre em contato com o suporte para mais informações.
        </p>
        <Button className="mt-6" variant="secondary" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          Sair da conta
        </Button>
      </Card>
    </main>
  );
}
