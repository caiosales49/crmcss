# CRM SaaS Firebase

CRM comercial multi-tenant para pequenas e médias empresas, criado com Next.js App Router, TypeScript, Tailwind CSS e Firebase como backend exclusivo.

## Módulos

- Login com Google e criação automática de usuário, empresa e assinatura trial.
- Dashboard com vendas, estoque, financeiro, lucro, fluxo de caixa, alertas e gráficos.
- Produtos com SKU, código de barras, fornecedor, margem, estoque mínimo, status, duplicação e scanner por câmera.
- Estoque com histórico de movimentações e estrutura para lote/validade.
- Clientes com dados de contato, endereço, histórico financeiro e status.
- PDV com busca rápida, scanner, carrinho, desconto, forma de pagamento e baixa transacional de estoque.
- Financeiro com receitas, despesas, recorrência, contas e fluxo de caixa.
- Relatórios com fila para PDF, Excel e CSV via Cloud Functions.
- Configurações da empresa, logo, moeda, tema e estrutura de assinatura.

## Preparação

1. Crie um projeto Firebase com Authentication, Firestore, Storage, Hosting e Functions.
2. Ative o provedor Google no Firebase Authentication.
3. Copie `.env.example` para `.env.local` e preencha as chaves públicas do Firebase.
4. Ajuste `.firebaserc` com o ID real do projeto.
5. Instale as dependências:

```bash
npm install
npm --prefix functions install
```

6. Rode localmente:

```bash
npm run dev
```

## Firebase

Deploy das regras, índices, hosting e functions:

```bash
firebase deploy
```

As regras garantem que todo documento com `companyId` seja acessível apenas por usuários da mesma empresa. A assinatura é criada em modo `trialing` no primeiro login e a camada `SubscriptionService` bloqueia o app quando o status deixa de ser válido.

## Estrutura

```txt
app/          Rotas do Next.js
components/   UI compartilhada e layout
contexts/     Sessão e cache
features/     Telas por módulo
firebase/     SDK modular
services/     Serviços e repositório Firestore
types/        Contratos TypeScript
validators/   Zod + React Hook Form
functions/    Cloud Functions
```
