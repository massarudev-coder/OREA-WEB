# OREA

## Credenciais do Firebase Admin

Nunca envie chaves de conta de serviço ao Git. O arquivo `serviceAccountKey.json`
é ignorado pelo Git e deve permanecer apenas localmente.

Para desenvolvimento local no PowerShell, configure o caminho de uma chave válida:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\caminho\para\serviceAccountKey.json"
npm run dev
```

Em produção, configure Application Default Credentials no ambiente de execução.
Se `GOOGLE_APPLICATION_CREDENTIALS` estiver definido, o Firebase Admin usa o
arquivo indicado; caso contrário, usa as credenciais padrão do ambiente.
