# Tutorial rapido de deploy

Este projeto usa duas etapas:

- `test`: recebe todo ajuste primeiro para validacao.
- `main`: recebe apenas o que ja foi aprovado em `test` e vai para producao.

Links:

- Teste: https://crmcss-30b79--test-bi4ohn3r.web.app
- Producao: https://crmcss-30b79.web.app

## 1. Antes de subir

Rode as validacoes locais:

```bash
npm run typecheck
npm run lint
npm run build
```

Se algum comando der erro, corrija antes de fazer deploy.

## 2. Subir para teste

Entre na branch `test` e atualize com o GitHub:

```bash
git checkout test
git pull origin test
```

Se voce fez ajustes em outra branch ou na `main`, leve os commits para `test` antes de publicar.

Depois envie a branch:

```bash
git push origin test
```

Publique no canal de teste do Firebase:

```bash
npx firebase-tools hosting:channel:deploy test --project crmcss-30b79 --expires 30d
```

Abra e teste:

```text
https://crmcss-30b79--test-bi4ohn3r.web.app
```

Confira principalmente login, troca de abas, cadastro de produtos e paginas que foram alteradas.

## 3. Aprovar teste e mandar para producao

Quando o teste estiver aprovado, volte para `main`:

```bash
git checkout main
git pull origin main
```

Junte a branch `test` na `main`:

```bash
git merge test
```

Envie a `main` para o GitHub:

```bash
git push origin main
```

Publique a producao no Firebase:

```bash
npx firebase-tools deploy --only hosting --project crmcss-30b79
```

Abra e valide:

```text
https://crmcss-30b79.web.app
```

## 4. Deploy de regras e backend Firebase

Use este comando quando mudar Firestore Rules, indexes, Storage Rules ou Functions:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage,functions --project crmcss-30b79 --force
```

## 5. Observacoes importantes

- Nunca suba direto para producao sem testar no link de `test`.
- O arquivo `.env.local` fica apenas na maquina e nao deve ir para o GitHub.
- As chaves `NEXT_PUBLIC_FIREBASE_*` sao publicas para o frontend, mas devem ficar em secrets/configuracao do ambiente, nao em arquivos versionados.
- Se aparecer erro de chunk ou tela branca depois do deploy, faca um refresh forte no navegador: `Cmd + Shift + R`.
