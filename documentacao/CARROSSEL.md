# Carrossel de Anúncios

O sistema agora suporta um conjunto de itens que aparecem no carrossel exibido na página inicial de comunicados.

## Banco de dados

Uma nova tabela `Carrossel` foi adicionada ao esquema; execute o SQL abaixo em sua base de dados (já está incluído em `BANCO/banco_intranet.sql`):
> **Nota sobre data**
> - O campo `publicado_em` deve ser enviado no formato `dd/mm/aaaa`; o servidor converte
>   automaticamente para o formato `YYYY-MM-DD` usado internamente, retornando erro 400 se
>   inválido.
> - Se o campo for omitido na requisição de criação o backend definirá a data como hoje
>   (também formatada para `dd/mm/aaaa`).

```sql
CREATE TABLE IF NOT EXISTS Carrossel (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(150) NOT NULL,
  conteudo TEXT NOT NULL,
  imagem_url VARCHAR(500) NULL,

  status ENUM('RASCUNHO','PUBLICADO') NOT NULL DEFAULT 'RASCUNHO',

  publicado_por_admin_id BIGINT UNSIGNED NULL,
  publicado_por_nome VARCHAR(100) NULL,
  publicado_em DATE NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_car_status (status),
  CONSTRAINT fk_car_pub_admin FOREIGN KEY (publicado_por_admin_id)
    REFERENCES Administracao(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Os registros podem ser manipulados diretamente (via SQL) ou por endpoints REST; não há interface administrativa dedicada, mas o servidor aceita as seguintes requisições:

- `GET /api/carousel` – lista pública de slides (apenas itens `PUBLICADO`)
- `GET /api/carousel/:id` – detalhes de um slide
- **Admin**: `GET /api/admin/carousel` etc. (requer token) para criar/editar/excluir

O campo `imagem_url` deve apontar para um recurso acessível (`/uploads/...` ou URL completo). O `conteudo` pode conter HTML para formatar texto e imagens adicionais; ele será renderizado com `dangerouslySetInnerHTML` no cliente.

## Front‑end

- `src/components/Carousel` exibe os slides, com indicadores, arraste e avanço automático; ao clicar, redireciona para `/anuncio/:id`.
- `src/pages/PaginaAnuncio.tsx` mostra a página de detalhe com título, metadados, conteúdo e uma imagem principal.
- Tipos em `src/tipos/carousel.ts`, API em `src/api/carousel.api.ts` e hook em `src/hooks/useCarousel.ts`.

A página de anúncio reutiliza o `BarraTopo` e segue o mesmo layout de artigo do sistema.

### Administração

O painel administrativo agora possui uma opção "Carrossel" no menu lateral para acessar a manutenção.
O item também aparece como atalho no cabeçalho (BarraTopo). Em /frontend/src/pages/admin/ estão as
páginas `PaginaAdminCarousel` (lista) e `PaginaAdminCarouselEdit` (formulário de criação/edição).

## Uso

Após inserir registros na tabela, basta recarregar a página de comunicados para ver os slides. Clique em um slide para abrir a respectiva página de anúncio.

---
