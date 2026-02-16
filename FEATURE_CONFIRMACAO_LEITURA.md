# Feature: Confirmação de Leitura em Comunicados

## Resumo
Feature que permite admins criarem comunicados que exigem confirmação de leitura dos colaboradores. Os colaboradores podem confirmar que leram, e os admins podem ver quem confirmou.

## Status
✅ **Implementação Completa** (Backend + Frontend + Database Schema)
⚠️ **Faltando:** Executar migração no banco de dados

## Pré-requisitos

### 1. Migração do Banco de Dados
A coluna `requer_confirmacao` precisa ser adicionada à tabela `Comunicados` no MySQL.

**SQL a executar:**
```sql
ALTER TABLE Comunicados 
ADD COLUMN requer_confirmacao TINYINT(1) NOT NULL DEFAULT 0 
AFTER publicado_por_nome;

CREATE INDEX idx_com_requer_confirmacao ON Comunicados(requer_confirmacao);
```

**Localização do arquivo de migração:** `documentacao/BANCO/migration_add_requer_confirmacao.sql`

**Como executar:**
1. Abra MySQL Workbench ou ferramenta similar
2. Conecte ao banco `intranet_rh` com credenciais em `backend/.env`
3. Execute o SQL acima

### 2. Verificar Alterações de Código

#### Backend (`backend/src/`)
- ✅ `services/comunicados.service.js` - Queries incluem `requer_confirmacao` e `confirmacoes_count`
- ✅ `services/comunicadoReads.service.js` - Método `confirmRead()` verifica `requer_confirmacao`
- ✅ `controllers/comunicados.controller.js` - Endpoints públicos, colab e admin implementados
- ✅ `routes/comunicados.routes.js` - Rotas configuradas

#### Frontend (`frontend/src/`)
- ✅ `tipos/comunicados.ts` - Tipos adicionados: `requer_confirmacao`, `confirmed_by_me`, `confirmacoes_count`
- ✅ `api/comunicados.api.ts` - Endpoints: `obterComunicadoColab()`, `confirmarLeituraColab()`, `obterConfirmacoesComunicadoAdmin()`
- ✅ `hooks/useComunicados.ts` - Hook agora aceita `token` e roteia para endpoints corretos
- ✅ `pages/PaginaComunicados.tsx` - UI para confirmação com badge e botão
- ✅ `pages/PaginaComunicados.css` - Estilos para confirmação com gradient e hover effects
- ✅ `pages/admin/PaginaAdminCriarComunicado.tsx` - Checkbox para `requer_confirmacao`, lista de confirmadores

## Fluxo da Feature

### 1. Admin Criar Comunicado com Confirmação Obrigatória
- Acessa `/admin` → Criar novo comunicado
- Marca checkbox "Requer confirmação de leitura"
- Preenche outros dados e salva
- Backend salva com `requer_confirmacao = 1`

### 2. Colaborador Ver Comunicado (Público)
- Acessa `/` → Lista de comunicados
- Clica para abrir detalhe
- Se `requer_confirmacao = 1`:
  - Vê badge com "X confirmação(ões)"
  - Se NOT LOGGED IN: Vê aviso "Faça login para confirmar a leitura"
  - Se LOGGED IN como COLAB: Vê botão azul "Confirmar leitura"

### 3. Colaborador Confirmar Leitura
- Clica no botão "Confirmar leitura"
- Frontend chama `POST /colaborador/comunicados/:id/confirmar-leitura`
- Backend verifica:
  - Token válido (JWT)
  - Comunicado existe e está PUBLICADO
  - Não expirou
  - Insere registro em `ComunicadoReadConfirmations` (idempotente)
- Frontend atualiza:
  - Botão muda para "✓ Confirmado" (verde, disabled)
  - Badge incrementa contador

### 4. Admin Ver Confirmações
- Acessa `/admin` → Edita comunicado
- Se tem confirmações, vê lista com:
  - Nome do colaborador
  - Data/hora da confirmação
  - Total de confirmações

## Endpoints Implementados

### Públicos (sem auth)
```
GET /comunicados/:id
Response: { ..., requer_confirmacao, confirmacoes_count }
```

### Colaborador (auth COLAB)
```
GET /colaborador/comunicados/:id
Response: { ..., requer_confirmacao, confirmacoes_count, confirmed_by_me }

POST /colaborador/comunicados/:id/confirmar-leitura
Body: null
Response: { message: "Confirmação registrada" } | { error }
```

### Admin (auth ADMIN, level >= 1)
```
GET /admin/comunicados/:id/confirmacoes
Response: { items: [ { id, colaborador_id, colaborador_nome, confirmed_at }, ... ] }
```

## Testes Manuais Recomendados

### Teste 1: Criar Comunicado com Confirmação
1. Acesse `/admin` (login como ADMIN)
2. Clique "Novo Comunicado"
3. Preencha dados
4. ✅ Marque "Requer confirmação de leitura"
5. Salve
6. Verifique DB: `SELECT requer_confirmacao FROM Comunicados WHERE id = <novo_id>;` → deve ser `1`

### Teste 2: Ver Comunicado Sem Login
1. Faça logout ou abra aba anônima
2. Acesse `/`
3. Clique em comunicado do Teste 1
4. ✅ Deve ver badge "0 confirmação"
5. ✅ Deve ver mensagem "Faça login para confirmar a leitura"
6. ❌ NÃO deve ver botão de confirmação

### Teste 3: Confirmar Leitura Como Colab
1. Faça login como COLAB
2. Acesse comunicado do Teste 1
3. ✅ Deve ver botão azul "Confirmar leitura"
4. Clique no botão
5. ✅ Botão deve mudar para verde "✓ Confirmado"
6. ✅ Badge deve incrementar para "1 confirmação"

### Teste 4: Ver Confirmações Como Admin
1. Faça logout e login como ADMIN
2. Acesse `/admin` → edite comunicado do Teste 1
3. ✅ Deve ver seção "Confirmações" com lista:
   - Nome do colaborador que confirmou
   - Horário da confirmação
4. ✅ Total deve ser "1 confirmação"

### Teste 5: Criar Sem Confirmação
1. Crie novo comunicado SEM marcar "Requer confirmação"
2. Acesse como colaborador
3. ✅ NÃO deve ver seção de confirmação
4. ✅ Deve ver apenas o conteúdo do comunicado

## Dados de Teste

Usar credenciais do `.env`:
- **COLAB:** usuário qualquer cadastrado como COLAB
- **ADMIN:** usuário RH cadastrado como ADMIN

## Debug

Se a feature não funcionar:

1. **Verificar coluna no DB:**
   ```sql
   DESCRIBE Comunicados;
   -- Procure por "requer_confirmacao" com tipo "tinyint"
   ```

2. **Verificar resposta da API:**
   - Abra DevTools → Network
   - Clique em comunicado que deveria ter confirmação
   - Procure por requisição GET `/comunicados/:id` ou `/colaborador/comunicados/:id`
   - Verifique se resposta inclui `requer_confirmacao: 1` e `confirmacoes_count: 0`

3. **Console do Frontend:**
   - Abra DevTools → Console
   - Deve ver logs: `[DEBUG] detalheAberto: { ... requer_confirmacao: 1 ... }`

4. **Verificar Tabela ComunicadoReadConfirmations:**
   ```sql
   SELECT * FROM ComunicadoReadConfirmations;
   -- Deve ter registros com comunicado_id, colaborador_id, confirmed_at
   ```

## Troubleshooting

### Botão não aparece
- [ ] Coluna foi adicionada ao DB?
- [ ] Comunicado foi criado com `requer_confirmacao = 1`?
- [ ] Está logado como COLAB?
- [ ] Verificar console para `[DEBUG] detalheAberto`

### Confirmação não salva
- [ ] Token é válido?
- [ ] Endpoint `/colaborador/comunicados/:id/confirmar-leitura` existe?
- [ ] Verificar logs do backend para erros

### Contador não incrementa
- [ ] Verificar em BD: `SELECT * FROM ComunicadoReadConfirmations WHERE comunicado_id = X`
- [ ] Insira manualmente para testar: `INSERT INTO ComunicadoReadConfirmations (comunicado_id, colaborador_id, confirmed_at) VALUES (X, Y, NOW())`

## Arquivos Modificados

### Backend
- `src/services/comunicados.service.js` - Queries e lógica
- `src/services/comunicadoReads.service.js` - Confirmação
- `src/controllers/comunicados.controller.js` - Endpoints
- `src/routes/comunicados.routes.js` - Rotas

### Frontend
- `src/tipos/comunicados.ts` - Tipos
- `src/api/comunicados.api.ts` - HTTP calls
- `src/hooks/useComunicados.ts` - Hook com token support
- `src/pages/PaginaComunicados.tsx` - UI principal
- `src/pages/PaginaComunicados.css` - Estilos
- `src/pages/admin/PaginaAdminCriarComunicado.tsx` - Admin form

### Database
- `documentacao/BANCO/banco_intranet.sql` - Schema atualizado
- `documentacao/BANCO/migration_add_requer_confirmacao.sql` - Script de migração

## Próximos Passos

1. ✅ Executar migração no MySQL
2. ✅ Iniciar backend (`npm start` em `backend/`)
3. ✅ Iniciar frontend (`npm run dev` em `frontend/`)
4. ✅ Executar testes manuais acima
5. ✅ Reportar issues no GitHub/GitLab

---

**Última atualização:** 2025 (em progresso)
**Responsável:** Feature de Confirmação de Leitura
