# OREA

Loja web com vitrine pública, painel administrativo, API Express e produtos armazenados no Cloud Firestore.

## Configuração do Firebase

1. No Firebase Console, habilite o **Cloud Firestore** e o método **E-mail/senha** em Authentication.
2. Crie uma conta para o administrador em Authentication.
3. Na configuração de um app Web do projeto Firebase, copie o `apiKey`. É a chave pública da configuração Web; não use nem publique o conteúdo de `serviceAccountKey.json`.
4. Configure as variáveis de ambiente no PowerShell:

```powershell
setx GOOGLE_APPLICATION_CREDENTIALS "C:\Users\nando\OREA\serviceAccountKey.json"
setx FIREBASE_WEB_API_KEY "sua-api-key-do-app-web"
setx ADMIN_EMAILS "admin@exemplo.com"
```

`ADMIN_EMAILS` deve conter o e-mail da conta administrativa do Firebase. Para mais de um administrador, separe os endereços por vírgula. Também é possível autorizar um usuário com a custom claim Firebase `admin: true`.

Feche e reabra o VS Code para carregar as variáveis e, no terminal integrado aberto na pasta `OREA`, execute:

```powershell
npm run dev
```

Para configurar apenas o terminal atual, use `$env:VARIAVEL = "valor"` em vez de `setx`. O arquivo `serviceAccountKey.json` precisa existir localmente e continua ignorado pelo Git.

## Uso

- Vitrine pública: `http://localhost:3000`
- Login administrativo: `http://localhost:3000/login.html`
- Painel: `http://localhost:3000/admin.html`

Os produtos são lidos do Firestore pela API pública. A vitrine consulta a API novamente a cada 10 segundos para refletir inclusões, edições e exclusões.

O painel autentica pelo Firebase Authentication e usa um cookie de sessão `HttpOnly`, validado no servidor. As rotas de criação, edição e exclusão exigem sessão administrativa; apenas esconder o painel no navegador não concede acesso à API.

## API

- `GET /api/produtos` e `GET /api/produtos/:id`: leitura pública.
- `POST /api/produtos`, `PUT /api/produtos/:id` e `DELETE /api/produtos/:id`: exigem login administrativo.
- `POST /api/sessao`, `GET /api/sessao` e `DELETE /api/sessao`: criação, consulta e encerramento da sessão.

## Verificação

```powershell
npm run verificar
npm run build
```
