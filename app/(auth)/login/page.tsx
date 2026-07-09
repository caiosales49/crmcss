"use client";

import { motion } from "framer-motion";
import { Chrome, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/authProvider";
import { hasFirebaseConfig } from "@/lib/env";

export default function LoginPage() {
  const { signIn, loading } = useAuth();
  const configured = hasFirebaseConfig();

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex items-center px-6 py-10 sm:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="max-w-2xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Multi-tenant com Firebase
          </div>
          <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
            CRM SaaS para gestão comercial css develop
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Produtos, estoque, PDV, clientes, financeiro e relatórios em uma base
            preparada para crescer com várias empresas no mesmo ambiente.
          </p>
        </motion.div>
      </section>
      <section className="flex items-center justify-center border-t border-border bg-card px-6 py-10 lg:border-l lg:border-t-0">
        <Card className="w-full max-w-md p-6">
          <h2 className="text-xl font-semibold">Entrar</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use sua conta Google para criar automaticamente sua empresa e seu usuário proprietário.
          </p>
          {!configured && (
            <div className="mt-5 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              Configure o arquivo .env.local com as chaves públicas do Firebase antes do login.
            </div>
          )}
          <Button
            className="mt-6 w-full"
            disabled={!configured || loading}
            onClick={() => void signIn()}
          >
            <Chrome className="h-4 w-4" />
            Entrar com Google
          </Button>
        </Card>
      </section>
    </main>
  );
}
