"use client";

import { motion } from "framer-motion";
import { Chrome, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/authProvider";
import { hasFirebaseConfig } from "@/lib/env";

export default function LoginPage() {
  const router = useRouter();
  const { createAccountWithEmail, signIn, signInWithEmail, loading, user, profile } = useAuth();
  const configured = hasFirebaseConfig();
  const [mode, setMode] = useState<"login" | "create">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (user || profile)) {
      router.replace("/dashboard");
    }
  }, [loading, profile, router, user]);

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError("Informe um e-mail válido e senha com pelo menos 6 caracteres.");
      return;
    }
    if (mode === "create" && name.trim().length < 2) {
      setError("Informe seu nome para criar a conta.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "create") {
        await createAccountWithEmail({ name, email, password });
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível autenticar.");
    } finally {
      setSubmitting(false);
    }
  }

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
            CRM para gestão comercial
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Produtos, estoque, PDV, clientes, financeiro e relatórios em uma base
            preparada para crescer com várias empresas no mesmo ambiente.
          </p>
        </motion.div>
      </section>
      <section className="flex items-center justify-center border-t border-border bg-card px-6 py-10 lg:border-l lg:border-t-0">
        <Card className="w-full max-w-md p-6">
          <div className="flex rounded-md border border-border bg-muted p-1">
            <button
              type="button"
              className={`h-9 flex-1 rounded px-3 text-sm font-medium ${mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setMode("login")}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`h-9 flex-1 rounded px-3 text-sm font-medium ${mode === "create" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setMode("create")}
            >
              Criar conta
            </button>
          </div>
          <h2 className="mt-5 text-xl font-semibold">{mode === "create" ? "Criar conta" : "Entrar"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use e-mail e senha ou continue com Google. Contas novas podem criar a primeira loja depois do cadastro.
          </p>
          {!configured && (
            <div className="mt-5 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              Configure o arquivo .env.local com as chaves públicas do Firebase antes do login.
            </div>
          )}
          <form className="mt-5 grid gap-3" onSubmit={submitEmail}>
            {mode === "create" && (
              <Input
                placeholder="Seu nome"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={!configured || loading || submitting}>
              {mode === "create" ? "Criar conta e loja" : "Entrar com e-mail"}
            </Button>
          </form>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            disabled={!configured || loading || submitting}
            onClick={() => void signIn()}
          >
            <Chrome className="h-4 w-4" />
            Entrar com Google
          </Button>
          <div className="mt-5 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            Ao criar uma conta nova, cadastre sua loja na próxima tela. Funcionários continuam entrando quando o e-mail for liberado pelo proprietário.
          </div>
        </Card>
      </section>
    </main>
  );
}
