# Funcionalidade: Confirmação de Leitura em Comunicados

## Visão Geral
Adicionada a funcionalidade de **confirmação de leitura** em comunicados. Os admins podem marcar um comunicado para exigir confirmação, e os colaboradores podem confirmar que leram o comunicado. Admins conseguem ver quem confirmou a leitura.

## Mudanças Implementadas

### Backend

#### 1. **Banco de Dados**
- **Nova coluna**: `Comunicados.requer_confirmacao` (TINYINT DEFAULT 0)
- **Migration**: `documentacao/BANCO/migration_add_requer_confirmacao.sql`
  - Execute: `ALTER TABLE Comunicados ADD COLUMN requer_confirmacao TINYINT(1) NOT NULL DEFAULT 0;`

#### 2. **Serviços**
- `backend/src/services/comunicados.service.js`:
  - `createComunicado()`: Agora salva `requer_confirmacao`
  - `updateComunicado()`: Agora atualiza `requer_confirmacao`
  - `getComunicadoById()`: Retorna `requer_confirmacao` e `confirmacoes_count`
  - `listPublicComunicados()`: Inclui `requer_confirmacao` e `confirmacoes_count`
  - `listAdminComunicados()`: Inclui `requer_confirmacao` e `confirmacoes_count`
  - `listComunicadoConfirmacoes()`: Lista colaboradores que confirmaram

- `backend/src/services/comunicadoReads.service.js`:
  - `confirmRead()`: Atualizado para verificar `requer_confirmacao` em vez de apenas `IMPORTANTE`
  - Validações mantidas: status PUBLICADO, não expirado, etc.

#### 3. **Controllers**
- `backend/src/controllers/comunicados.controller.js`:
  - `criar()`: Passa `requer_confirmacao` ao serviço
  - `atualizar()`: Passa `requer_confirmacao` ao serviço
  - `obterParaColaborador()`: Retorna detalhe com `confirmed_by_me`
  - `listarConfirmacoesAdmin()`: Lista confirmações

#### 4. **Rotas**
- `backend/src/routes/comunicados.routes.js`:
  - `GET /colaborador/comunicados/:id` — Detalhe autenticado (COLAB)
  - `GET /admin/comunicados/:id/confirmacoes` — Lista de confirmadores (ADMIN)
  - Rota existente `POST /colaborador/comunicados/:id/confirmar-leitura` — Continua funcionando

### Frontend

#### 1. **Tipos**
- `frontend/src/tipos/comunicados.ts`:
  - `ComunicadoResumo`: Adicionado `requer_confirmacao?`
  - `ComunicadoDetalhe`: Adicionado `confirmacoes_count?` e `confirmed_by_me?`
  - `ConfirmacaoComunicado`: Tipo para listar confirmadores

#### 2. **API**
- `frontend/src/api/comunicados.api.ts`:
  - `obterComunicadoColab()`: GET autenticado `/colaborador/comunicados/:id`
  - `confirmarLeituraColab()`: POST `/colaborador/comunicados/:id/confirmar-leitura`
  - `obterConfirmacoesComunicadoAdmin()`: GET `/admin/comunicados/:id/confirmacoes`
  - `ComunicadoAdminPayload`: Adicionado `requer_confirmacao?: boolean`

#### 3. **Hooks**
- `frontend/src/hooks/useComunicados.ts`:
  - Aceita opcionalmente `token` param
  - Se token fornecido, fetcha detalhe autenticado (`obterComunicadoColab`)
  - Retorna `confirmed_by_me` no detalhe

#### 4. **Páginas**

**Colaborador (PaginaComunicados.tsx)**:
- Exibe total de confirmações se `requer_confirmacao=true`
- Mostra botão **"Confirmar leitura"** apenas se:
  - `requer_confirmacao=true`
  - Usuário logado (COLAB)
  - Não já confirmou (`confirmed_by_me=false`)
- Ao clicar, desativa o botão e mostra **"✓ Leitura confirmada"**

**Admin (PaginaAdminCriarComunicado.tsx)**:
- Novo checkbox: **"Requer confirmação de leitura"**
- Ao editar um comunicado, mostra seção com:
  - **Total de confirmações**
  - **Lista de colaboradores que confirmaram** com data/hora

## Fluxo de Uso

### 1. Admin Cria Comunicado com Confirmação
1. Acessa `/admin/criar-comunicado`
2. Preenche título, descrição, etc.
3. **Marca checkbox**: "Requer confirmação de leitura"
4. Clica **"Publicar"**

### 2. Colaborador Visualiza e Confirma
1. Acessa `PaginaComunicados` (tela principal)
2. Faz login (COLAB)
3. Abre um comunicado que exige confirmação
4. Vê campo: **"X confirmações de leitura"**
5. Clica **"Confirmar leitura"** (botão ativo se não confirmou)
6. Botão muda para **"✓ Leitura confirmada"** e fica desabilitado

### 3. Admin Monitora Confirmações
1. Acessa `/admin`
2. Seleciona um comunicado publicado que exige confirmação
3. Na página de edição, vê seção **"Confirmações de leitura"**:
   - Total: X confirmações
   - Lista: Nome do colaborador + Data/Hora da confirmação

## Teste Manual

### Requisitos
- Backend rodando (`npm start` em `/backend`)
- Frontend rodando (`npm run dev` em `/frontend`)
- Banco de dados migrado (execute `migration_add_requer_confirmacao.sql`)

### Passos

1. **Crie um comunicado com confirmação**:
   - Login como ADMIN em `http://localhost:5173`
   - Botão "Painel ADM" > "/admin"
   - "Criar Comunicado"
   - Preencha: título, descrição, importância (pode ser qualquer uma)
   - **Marque**: "Requer confirmação de leitura"
   - Defina: Data de expiração (hoje + 7 dias)
   - Clique: "Publicar"

2. **Confirme como Colaborador**:
   - Faça logout (logout do admin)
   - Acesse `http://localhost:5173` (página pública)
   - Clique: "Comunicados" (já aberto por padrão)
   - Clique em um card de comunicado que exija confirmação
   - Veja: Contagem de confirmações + botão "Confirmar leitura"
   - Clique: "Confirmar leitura"
   - Esperado: Botão muda para "✓ Leitura confirmada" e fica desabilitado

3. **Visualize Confirmações como Admin**:
   - Faça login novamente como ADMIN
   - Acesse `/admin`
   - Abra o comunicado que criou
   - Veja seção: "Confirmações de leitura"
   - Esperado: Deve listar o colaborador que confirmou + data/hora

## Regras de Negócio

- ✅ Confirmação só é possível se `requer_confirmacao=true`
- ✅ Confirmação só é possível se comunicado está `PUBLICADO`
- ✅ Confirmação só é possível se comunicado **não expirou** (`expira_em >= hoje`)
- ✅ Cada colaborador confirma **apenas 1 vez** por comunicado (idempotente)
- ✅ Apenas admins veem a lista de confirmadores
- ✅ Colaboradores veem o total de confirmações
- ✅ Botão de confirmação desaparece/desabilita após confirmação

## Arquivos Modificados

### Backend
- `src/services/comunicados.service.js` ✓
- `src/services/comunicadoReads.service.js` ✓
- `src/controllers/comunicados.controller.js` ✓
- `src/routes/comunicados.routes.js` ✓

### Frontend
- `src/tipos/comunicados.ts` ✓
- `src/api/comunicados.api.ts` ✓
- `src/hooks/useComunicados.ts` ✓
- `src/pages/PaginaComunicados.tsx` ✓
- `src/pages/admin/PaginaAdminCriarComunicado.tsx` ✓

### Database
- `documentacao/BANCO/banco_intranet.sql` (schema atualizado) ✓
- `documentacao/BANCO/migration_add_requer_confirmacao.sql` (nova) ✓

## Notas Importantes

1. **Backcompat**: A coluna `requer_confirmacao` tem default 0, então comunicados antigos não são afetados
2. **Validação**: Apenas colaboradores podem confirmar (middleware `requireRole("COLAB")`)
3. **Idempotência**: Confirmar 2x não duplica registro (unique constraint)
4. **Contadores**: `confirmacoes_count` é calculado dinamicamente (subquery) a cada busca
