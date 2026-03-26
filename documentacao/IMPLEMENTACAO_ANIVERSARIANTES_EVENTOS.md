# Implementação: Aniversariantes e Eventos Públicos

## Resumo das Mudanças

Este documento descreve as implementações realizadas para tornar públicos os dados de aniversariantes e eventos, bem como integrar a criação de eventos com o sistema de carrossel.

---

## 1. Aniversariantes - Rota Pública

### Backend

**Arquivo:** `src/routes/colaboradores.routes.js`
- Nova rota pública: `GET /aniversariantes`
- **Sem autenticação requerida**

**Arquivo:** `src/controllers/colaboradores.controller.js`
- Nova função: `listarAniversariantesMes()`
- Retorna aniversariantes do mês atual
- Apenas colaboradores com status ATIVO

**Arquivo:** `src/services/colaboradores.service.js`
- Utiliza função database para extrair mês de data_nascimento

### Frontend

**Arquivo:** `src/api/aniversariantes.api.ts`
- Nova API: `listarAniversariantesMes()`
- Rota pública, sem necessidade de token

**Arquivo:** `src/hooks/useAniversariantesPublico.ts`
- Novo hook que não requer autenticação
- Busca dados automaticamente ao montar o componente

**Arquivo:** `src/components/SecaoAniversariantes/SecaoAniversariantes.tsx`
- Ajustado para usar `useAniversariantesPublico`
- Agora funciona para usuários logados e não logados

**Benefício:** Aniversariantes são exibidos automaticamente quando a página Home é aberta, sem necessidade de login.

---

## 2. Eventos - Integração com Carrossel

### Estrutura do Banco de Dados

**Migração:** `documentacao/MIGRACAO_CAROUSEL_EVENTOS.sql`

Novos campos na tabela `Carrossel`:
- `eh_evento` (BOOLEAN, DEFAULT FALSE) - Marca se o item é um evento
- `foto_perfil` (VARCHAR(500)) - Foto de perfil do evento (obrigatória quando eh_evento=true)

Novo índice:
- `idx_carrossel_evento` em (status, eh_evento) para queries rápidas

### Backend

**Arquivo:** `src/controllers/carousel.controller.js`
- Schema validação atualizado: `CreateUpdateSchema`
- Novo campo: `eh_evento` (boolean)
- Novo campo: `foto_perfil` (string, obrigatório quando eh_evento=true)
- Validação: refine() garante que foto_perfil é obrigatória se eh_evento for true

**Arquivo:** `src/services/carousel.service.js`
- `createCarouselItem()` - Suporta eh_evento e foto_perfil
- `updateCarouselItem()` - Suporta eh_evento e foto_perfil
- `getCarouselItemById()` - Retorna eh_evento e foto_perfil
- `listAdminCarouselItems()` - Retorna eh_evento e foto_perfil

**Arquivo:** `src/controllers/eventos.controller.js`
- Queries atualizadas para buscar de `Carrossel` em vez de `Eventos`
- `listarEventosPublicados()` - Retorna todos os carrosseis com eh_evento=true e status=PUBLICADO
- `obterEventoAtual()` - Retorna o evento/carrossel mais recente
- `obter()` - Retorna um evento específico desde que eh_evento=true

**Benefício:** Quando um administrador publica algo no carrossel e marca "É um Evento", isso automaticamente:
1. Requer incluir uma foto de perfil
2. Aparece na seção de Eventos da página inicial
3. Exibe a mesma interface do carrossel com foto de perfil circulada

---

## 3. Como Usar

### Para Publicar um Evento

1. Ir ao Painel Administrativo → Carrossel
2. Criar novo item ou editar existente
3. Preencher campos padrão:
   - Título
   - Conteúdo (descrição)
   - Imagem do carrossel
   - Data de publicação
4. **Novo:** Marcar checkbox "É um Evento"
5. **Novo:** Fazer upload obrigatório da "Foto de Perfil"
6. Publicar

### Resultado

- O item aparece nos dois lugares:
  - Carrossel da página principal (com imagem grande)
  - Seção de Eventos (com foto de perfil circulada)
- Clicar em qualquer evento exibe modal com foto de perfil no topo
- Todos podem ver (logado ou não)

---

## 4. Estrutura de Resposta da API

### GET /aniversariantes

```json
{
  "aniversariantes": [
    {
      "nome_completo": "João Silva",
      "data_nascimento": "1995-03-15",
      "dia": 15
    }
  ]
}
```

### GET /eventos

```json
{
  "eventos": [
    {
      "id": 1,
      "titulo": "Festa de Aniversário",
      "descricao": "Conteúdo do evento...",
      "data_inicio": "2026-03-26",
      "data_fim": "2026-03-26",
      "local": "",
      "imagem_url": "...",
      "foto_perfil": "...",
      "publicado_por_nome": "Admin"
    }
  ]
}
```

---

## 5. Próximas Etapas (Opcional)

- [ ] Teste de responsividade em mobile
- [ ] Validação de upload de fotos de perfil
- [ ] Limitação de tamanho de imagem
- [ ] Compressão automática de imagens
- [ ] Notificações quando um novo evento é publicado

---

## Execução da Migração

Para aplicar as mudanças no banco de dados:

```bash
mysql -u root -p seu_banco < documentacao/MIGRACAO_CAROUSEL_EVENTOS.sql
```

Ou copiar e colar na interface MySQL/phpMyAdmin.
