# Fluxo de Deploy

## Branches

- `test`: recebe todos os ajustes primeiro e publica em um canal de teste do Firebase Hosting por deploy manual até os secrets do GitHub estarem completos.
- `main`: recebe somente alterações aprovadas em `test` e publica em produção por deploy manual até os secrets do GitHub estarem completos.

## Sequência

1. Trabalhe localmente.
2. Faça commit na branch `test`.
3. Envie `test` para o GitHub.
4. Valide o app no canal de teste.
5. Faça merge de `test` para `main`.
6. Envie `main` para publicar em produção.

Enquanto os secrets `NEXT_PUBLIC_*` não estiverem cadastrados no GitHub, publique manualmente:

```bash
npx firebase-tools hosting:channel:deploy test --project crmcss-30b79 --expires 30d
npx firebase-tools deploy --only hosting --project crmcss-30b79
```

## Backend Firebase

Firestore Rules, Storage Rules e Cloud Functions usam permissões mais amplas do Google Cloud. Por enquanto, esse deploy fica manual pela máquina autorizada:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage,functions --project crmcss-30b79 --force
```

O deploy automático no GitHub Actions publica o Hosting.

## Secrets necessários no GitHub

Configure estes secrets em `Settings > Secrets and variables > Actions`:

- `FIREBASE_SERVICE_ACCOUNT_CRMCSS_30B79`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

As variáveis `NEXT_PUBLIC_*` são usadas no frontend, mas ficam como GitHub Secrets para evitar expor chaves em arquivos versionados.
