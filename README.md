# OpsAgenda — Sistema Corporativo de Gestão de Tarefas

Sistema multiusuário profissional para controle de manutenções, pendências e agendas internas.

---

## Stack

| Camada     | Tecnologia                                         |
|------------|----------------------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS + Lucide + Recharts |
| Backend    | Node.js + Express + Prisma ORM                     |
| Banco      | SQLite (pode ser migrado para PostgreSQL)           |
| Auth       | JWT + bcrypt                                       |
| Tempo real | Socket.IO                                          |

---

## Como Rodar

### 1. Backend

```bash
cd backend
npm install
npm run db:migrate
node src/app.js        # ou: npm run dev  (com nodemon)
```

O backend sobe em **http://localhost:3001**

### 2. Frontend (em outro terminal)

```bash
cd frontend
npm install
npm run dev
```

O frontend sobe em **http://localhost:5173**

---

## Primeiro Acesso — Criar conta de administrador

O banco inicia zerado. Registre o primeiro usuário via API:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Souza",
    "email": "maria@empresa.com",
    "password": "senha123",
    "role": "Gestora",
    "isAdmin": true,
    "isManager": true
  }'
```

Depois acesse **http://localhost:5173** e faça login.

---

## Sistema de Atraso Automático

| Atraso  | Visual                  |
|---------|-------------------------|
| 2 dias  | Borda amarela           |
| 3 dias  | Borda laranja           |
| 5 dias  | Borda vermelha          |
| 7+ dias | Borda vermelha pulsando |

Tarefas atrasadas sobem automaticamente ao topo da lista.

---

## Migração para PostgreSQL

Altere `backend/.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/opsagenda"
```
E `backend/prisma/schema.prisma` — troque `provider = "sqlite"` por `"postgresql"`.
Depois: `npm run db:migrate`.
