# Fluxo de Deploy

## Branches

- `test`: recebe todos os ajustes primeiro e publica em um canal de teste do Firebase Hosting.
- `main`: recebe somente alterações aprovadas em `test` e publica em produção.

## Sequência

1. Trabalhe localmente.
2. Faça commit na branch `test`.
3. Envie `test` para o GitHub.
4. Valide o app no canal de teste.
5. Faça merge de `test` para `main`.
6. Envie `main` para publicar em produção.

## Backend Firebase

Firestore Rules, Storage Rules e Cloud Functions usam permissões mais amplas do Google Cloud. Por enquanto, esse deploy fica manual pela máquina autorizada:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage,functions --project crmcss-30b79 --force
```

O deploy automático no GitHub Actions publica o Hosting.

## Secrets necessários no GitHub

O Firebase CLI já criou este secret no GitHub:

- `FIREBASE_SERVICE_ACCOUNT_CRMCSS_30B79`

As variáveis `NEXT_PUBLIC_*` do Firebase Web ficam declaradas nos workflows porque são configuração pública do frontend. As permissões privadas de deploy ficam apenas no secret `FIREBASE_SERVICE_ACCOUNT_CRMCSS_30B79`.
