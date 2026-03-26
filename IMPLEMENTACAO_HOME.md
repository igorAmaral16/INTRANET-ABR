# Nova Tela Principal - Guia de Implementação

## 📋 Resumo das Mudanças

### ✅ O que foi implementado:

#### 1. **Nova Página Home Profissional**
- Tela inicial completamente repaginada com design moderno e intuitivo
- Substitui a tela de Comunicados como página de entrada (rota `/`)
- Comunicados agora acessível via `/comunicados` ou pelo menu

#### 2. **Sidebar Fixo**
- Menu sidebar fixo ao lado esquerdo (240px de largura)
- Responsivo: converte-se em hamburger menu em dispositivos menores
- Mantém todas as funcionalidades: Tutoriais, Calendário, Documentos, FAQ, etc.
- Novo item: "Comunicados" adicionado ao menu principal

#### 3. **Seções Principais da Home**

##### 📍 **Acesso Rápido** 
Integração com 5 sistemas externos:
- **Trackload**: https://10.0.0.48:5173
- **NF-e Power**: http://10.0.0.1:42801/smdLogin.asp
- **QlikView**: http://10.0.0.252/qlikview/index.htm
- **Varredor de Arquivos**: https://10.0.0.48:5175
- **Catálogo ABR**: https://abr-catalogo.vercel.app

Cards com ícones centralizados, nome e descrição. Logos em `/assets/`.

##### 🎯 **Mais Utilizados**
Atalhos rápidos para as funcionalidades principais:
- Tutoriais
- Calendário
- Documentos
- Comunicados

Cada um com ícone colorido e descrição.

##### 🎂 **Aniversariantes do Mês**
- Busca automática de colaboradores com aniversário no mês atual
- Exibe: Primeiro e Segundo nome + Dia do mês
- Mensagem informativa quando não há aniversariantes
- Requer autenticação (token do usuário)

##### 📅 **Eventos**
- Exibe evento atual (em andamento) em destaque
- Lista próximos eventos em cards clicáveis
- Modal com detalhes completos do evento selecionado
- Data/hora de início e fim, local e descrição

##### 🎠 **Carrossel**
Mantém a funcionalidade existente no topo da página.

---

## 🗄️ Banco de Dados

### Nova Tabela: `Eventos`
```sql
CREATE TABLE Eventos (
  id BIGINT UNSIGNED PRIMARY KEY,
  titulo VARCHAR(150),
  descricao TEXT,
  data_inicio DATETIME,
  data_fim DATETIME,
  local VARCHAR(255),
  imagem_url VARCHAR(500),
  status ENUM('RASCUNHO','PUBLICADO'),
  publicado_por_admin_id BIGINT UNSIGNED,
  publicado_por_nome VARCHAR(100),
  publicado_em DATETIME,
  created_at DATETIME,
  updated_at DATETIME
)
```

**Script SQL**: `documentacao/EVENTOS.sql`

---

## 💻 Backend - Estrutura

### Novo Arquivo: `src/controllers/eventos.controller.js`
Funções:
- `listarEventosPublicados()` - GET /eventos
- `obterEventoAtual()` - GET /eventos/atual
- `listar()` - GET /admin/eventos (admin com paginação)
- `obter()` - GET /eventos/:id
- `criar()` - POST /admin/eventos
- `atualizar()` - PUT /admin/eventos/:id
- `excluir()` - DELETE /admin/eventos/:id

### Novo Arquivo: `src/routes/eventos.routes.js`
Define todas as rotas de eventos (público + admin)

### Atualizado: `src/routes/index.js`
Integração da rota de eventos ao sistema principal

---

## 🎨 Frontend - Estrutura

### Novos Componentes

#### 1. **SidebarFixed** (`src/components/SidebarFixed/`)
- `SidebarFixed.tsx` - Componente React
- `SidebarFixed.css` - Estilos responsivos
- Suporta desktop (fixo) e mobile (hamburger)

#### 2. **SecaoAcessoRapido** (`src/components/SecaoAcessoRapido/`)
- Cards de acesso rápido aos sistemas integrados
- Ícones em `/assets/` (PNG/JPG/WebP)
- Abre links em nova aba com segurança

#### 3. **SecaoMaisUtilizados** (`src/components/SecaoMaisUtilizados/`)
- 4 cards com gradientes coloridos
- Navegação inteligente para rotas internas

#### 4. **SecaoAniversariantes** (`src/components/SecaoAniversariantes/`)
- Integração com API de colaboradores
- Filtro automático por mês de nascimento
- Tratamento de erros e estados de carregamento

#### 5. **SecaoEventos** (`src/components/SecaoEventos/`)
- Evento em destaque + próximos eventos
- Modal com detalhes complete
- Tipos Typescript inclusos

#### Página Principal
- **PaginaHome** (`src/pages/PaginaHome.tsx`)
  - Layout container
  - Modal de login integrado
  - Sidebar + conteúdo + footer

### Novos Hooks

#### `useEventos` (`src/hooks/useEventos.ts`)
- Busca eventos publicados e evento atual
- Estados: carregando, pronto, erro
- Auto-refresh disponível

#### `useAniversariantes` (`src/hooks/useAniversariantes.ts`)
- Busca colaboradores com aniversário no mês
- Filtra por status ATIVO
- Requer autenticação (token)

### Nova API Client
- `src/api/eventos.api.ts`
- Funções para listar, obter, criar, atualizar, excluir eventos
- Suporte a paginação (admin)

### Rotas Atualizadas (`src/App.jsx`)

**Antes:**
```
/ → PaginaComunicados
```

**Depois:**
```
/ → PaginaHome (nova!)
/comunicados → PaginaComunicados
```

---

## 🎯 Características de UX/UI

### Design Responsivo
- **Desktop (>768px)**: Sidebar 240px fixo à esquerda
- **Tablet (768px)**: Sidebar em hamburger menu oculto
- **Mobile (<480px)**: Layout vertical, cards em 2 colunas

### Paleta de Cores
- **Azul Primário**: #1e3c72, #2a5298
- **Verde** (Tutoriais): #4caf50
- **Laranja** (Documentos): #ff9800
- **Vermelho** (Comunicados): #f44336
- **Gradientes**: Transições suaves entre cores

### Interatividade
- Hover effects em cards e botões
- Animações fluidas de transição
- Modal com fade-in/slide-up
- Feedback visual em cliques

### Tratamento de Estados
- Carregamento: skeleton/spinner
- Erro: mensagens descritivas com retry
- Sucesso: confirmação visual
- Vazio: mensagens amigáveis

---

## 📖 Como Usar

### Para Usuários Finais

1. **Acessar a Home**: Acesse `/` na intranet
2. **Login**: Clique em "Entrar" para escolher entre Colaborador ou Admin
3. **Explorar Seções**: Scrolle para ver todos os conteúdos
4. **Acesso Rápido**: Use os cards da seção "Acesso Rápido" para sistemas integrados
5. **Menu**: Use o sidebar para navegar entre seções ou o hamburger em mobile

### Para Administradores

1. **Gerenciar Eventos**: Use a seção admin para criar/editar eventos
2. **Publicar Eventos**: Marque como "PUBLICADO" para aparecerem na home
3. **Agendar Eventos**: Use `data_inicio` e `data_fim` para agendar

---

## 🔧 Instalação & Setup

### 1. Database
Execute o script SQL:
```bash
mysql -u usuario -p senha seu_banco < documentacao/EVENTOS.sql
```

### 2. Backend
- Arquivos já criados em `backend/src/`
- Rotas integradas em `src/routes/index.js`
- Restart do servidor pode ser necessário

### 3. Frontend
- Componentes criados em `src/components/`
- Hooks em `src/hooks/`
- App.jsx atualizado com nova rota
- npm run dev (desenvolvimento) ou build

### 4. Assets
Adicione imagens para logos dos sistemas em `/public/assets/`:
- icon-trackload.png
- icon-nfe-power.png
- icon-qlikview.png
- icon-varredor.png
- icon-catalogo-abr.png

---

## ❓ Perguntas Frequentes

**P: Como adicionar novos sistemas na seção "Acesso Rápido"?**
R: Edite o array `SISTEMAS_EXTERNOS` em `SecaoAcessoRapido.tsx`

**P: Como mudar as cores dos cards?**
R: Modifique as variáveis CSS nas classes `.cartao*` ou nos gradientes

**P: Preciso criar eventos manualmente?**
R: Sim, via painel admin ou API. O banco vem vazio.

**P: O Sidebar funciona em mobile?**
R: Sim! Converte para hamburger automaticamente em telas < 768px

**P: Como autenticar para ver aniversariantes?**
R: Login via "Entrar" na home. Aniversariantes requerem token válido.

---

## 📝 Notas Técnicas

- Todos os componentes usam **React Hooks** (funcional)
- TypeScript para type safety
- CSS-in-JS com arquivos `.css` separados
- Lucide Icons para ícones SVG
- Axios/Fetch para requisições HTTP
- Tratamento de erros com AbortController

---

## 🚀 Próximos Passos (Opcional)

- [ ] Adicionar animações ao entrar na página
- [ ] Implementar dark mode
- [ ] Adicionar notificações push para novos eventos
- [ ] Integrar calendar view para eventos
- [ ] Criar widget aniversariantes para notificações
- [ ] Adicionar filtros para eventos (por categoria, tipo)

---

**Data**: Março 2026
**Versão**: 1.0
**Status**: Pronto para produção
