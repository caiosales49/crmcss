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

Os valores `NEXT_PUBLIC_*` são os mesmos do `.env.local`.
