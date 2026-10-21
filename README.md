# HAI-Q — Painel

Gestão de clientes, créditos, convites e resultados do assessment HAI-Q.

Roda **separado** do app de assessment, mas usa o **mesmo banco**.

---

## Deploy no Railway

### 1. Repositório
Crie um repositório novo no GitHub e suba todos os arquivos desta pasta.

### 2. Projeto no Railway
New Project → Deploy from GitHub repo → selecione o repositório.

Não crie banco novo — este painel usa o banco do assessment.

### 3. Variáveis de ambiente

| Variável | Valor |
|---|---|
| `DATABASE_URL` | A mesma do app de assessment. Se os projetos forem separados no Railway, use a **URL pública** do Postgres, não a interna. |
| `PAINEL_URL` | A URL deste painel, ex.: `https://haiq-painel.up.railway.app` |
| `ASSESSMENT_URL` | `https://assessmenthaiq-production.up.railway.app` |
| `AUTH_SECRET` | String aleatória longa. Gere com:<br>`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `EMAIL_PROVIDER` | `disabled` por enquanto |

Gere o domínio em Settings → Networking e preencha `PAINEL_URL` com ele.

### 4. Banco
Rode `migracao_multitenant.sql` no Railway → banco → Data → Query.

É seguro com o sistema no ar: só cria tabelas novas e adiciona uma coluna
opcional em `Session`.

### 5. Primeiro admin
No Railway, serviço do painel → aba Settings → Shell (ou localmente com a
`DATABASE_URL` configurada):

```bash
ADMIN_EMAIL=voce@mindsight.com.br ADMIN_NOME="Seu Nome" npx tsx scripts/seed-admin.ts
```

### 6. Entrar
Acesse `/login`, informe o e-mail do admin.

**Sem e-mail configurado**, o link de acesso aparece no log do Railway.
Abra Deployments → View Logs e procure por `[login] Link para`.

---

## Ativar envio de e-mail

### Brevo — mais rápido, sem mexer em DNS

1. Conta gratuita em [brevo.com](https://brevo.com) — 300 e-mails/dia
2. Senders & IP → Add a sender → confirme pelo link recebido
3. SMTP & API → API Keys → crie uma chave v3
4. No Railway:

```
EMAIL_PROVIDER = brevo
EMAIL_API_KEY  = xkeysib-...
EMAIL_FROM     = o e-mail que você verificou
EMAIL_FROM_NAME = HAI-Q
```

### Resend — melhor entregabilidade, exige verificar domínio

1. Conta em [resend.com](https://resend.com) — 3.000 e-mails/mês
2. Domains → adicione o domínio → configure os registros DNS
3. API Keys → crie uma chave
4. No Railway: `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY=re_...`,
   `EMAIL_FROM=noreply@seudominio.com.br`

Sem e-mail configurado, nada quebra: os convites são criados normalmente e
os links saem pela exportação de convites.

---

## Como funciona

### Créditos

Um crédito equivale a uma pessoa que pode fazer o teste. O crédito pertence
à pessoa, não à sessão — se alguém começa, abandona e refaz, continua sendo
um crédito.

```
livre = total comprado − reservados − consumidos
```

| Estado | Quando | Reversível |
|---|---|---|
| Reservado | Convite criado, pessoa não começou | Sim — cancelar devolve o crédito |
| Consumido | Pessoa iniciou o teste | Não |

O saldo nunca é um campo que decrementa — é sempre contagem. Isso impede
estouro quando duas pessoas sobem listas ao mesmo tempo.

### Perfis

| Perfil | Pode |
|---|---|
| **ADMIN** (Mindsight) | Ver todos os clientes, criar clientes, lançar créditos, criar usuários, configurar a devolutiva de cada cliente |
| **TENANT** (cliente) | Ver apenas o próprio cliente: saldo, convites, resultados, exportações. Cancelar convites não iniciados. |

O isolamento é validado no servidor em toda requisição. Trocar o ID na URL
não dá acesso a outro cliente.

### Devolutiva por cliente

Na aba Clientes, cada cliente tem botões que ligam e desligam seções da
devolutiva do candidato. Isso grava em `Tenant.reportConfig`, e o app de
assessment lê essa coluna ao renderizar.

A devolutiva do RH nunca é afetada — ela sempre mostra tudo.

---

## Telas

| Rota | Quem acessa |
|---|---|
| `/login` | Todos |
| `/admin` | Admin: clientes, créditos, usuários, config de devolutiva |
| `/painel` | Cliente: saldo, convites, exportações |
| `/r/{sessionId}` | Atalho para a devolutiva do RH no app de assessment |

---

## Exportações

**Convites** — nome, e-mail, status, datas e link do teste de cada pessoa.
Serve para distribuir os links quando o e-mail não está configurado.

**Resultados** — todos os scores, pareceres, gaps e os links das duas
devolutivas.

Ambas em CSV com BOM e separador ponto e vírgula, para abrir direto no
Excel em português sem quebrar acentuação.
