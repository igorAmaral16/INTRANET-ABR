# Guia de Otimização e Validação de Imagens

## 📋 Resumo das Implementações

Implementamos um sistema completo de validação, otimização e exibição de imagens em todas as telas que utilizam uploads. As imagens agora têm:

✅ **Tamanho fixo adequado** - nunca serão estouradas nos elementos
✅ **Ajuste perfeito** - sempre exibidas corretamente em qualquer resolução
✅ **Recomendações visíveis** - ao fazer upload, o usuário vê tamanho ideal
✅ **Validação antes do envio** - garante que só imagens otimizadas sejam salvas
✅ **Aspect ratio mantido** - imagens não ficam distorcidas

---

## 🎯 Contextos de Imagem

### 1. **CAROUSEL (Carrossel - Héroe/Destaque)**
- **Ideal**: 1200x600px
- **Proporção**: 2:1 ou 16:9
- **Mínimo**: 800x400px
- **Máximo**: 2400x1200px
- **Uso**: Imagens em slide do carrossel principal
- **Páginas**: `/admin/carousel/[id]/editar`

### 2. **CAROUSEL_EVENT (Foto de Evento - Quadrada)**
- **Ideal**: 400x400px
- **Proporção**: 1:1 (quadrado)
- **Mínimo**: 300x300px
- **Máximo**: 800x800px
- **Uso**: Foto de perfil/representativa de eventos
- **Páginas**: `/admin/carousel/[id]/editar` (quando "É um evento?" está marcado)

### 3. **COMUNICADO (Anexo de Comunicado)**
- **Ideal**: 800x600px
- **Proporção**: 4:3
- **Mínimo**: 600x400px
- **Máximo**: 1600x1200px
- **Uso**: Imagens anexadas em comunicados
- **Páginas**: `/admin/criar-comunicado/[id]`

### 4. **THUMBNAIL (Miniatura)**
- **Ideal**: 300x300px
- **Proporção**: 1:1 (quadrado)
- **Mínimo**: 200x200px
- **Máximo**: 600x600px
- **Uso**: Imagens pequenas em cards/listas
- **Páginas**: Componentes de cards

### 5. **HERO (Full Width)**
- **Ideal**: 1920x600px
- **Proporção**: 16:9 ou 3:1
- **Mínimo**: 1200x400px
- **Máximo**: 4000x1200px
- **Uso**: Imagens em tela cheia
- **Páginas**: Páginas de destaque

---

## 🛠 Arquivos Criados/Modificados

### Novas Utilidades
1. **`frontend/src/utils/imageValidation.ts`**
   - Funções para validar imagens
   - Cálculo de dimensões
   - Recomendações automáticas
   - Formatação de mensagens

2. **`frontend/src/components/ImageUploadField/ImageUploadField.tsx`**
   - Componente reutilizável para upload
   - Validação em tempo real
   - Visualização de recomendações
   - Preview de imagem
   - Indicador de correspondência %

3. **`frontend/src/components/ImageUploadField/ImageUploadField.css`**
   - Estilos do componente de upload
   - Interface intuitiva e responsiva
   - Indicadores visuais de validação

4. **`frontend/src/styles/imageDisplay.css`**
   - CSS para garantir que imagens se ajustem perfeitamente
   - Aspect ratios por contexto
   - Prevenção de overflow
   - Responsividade mobile/tablet/desktop

### Páginas Atualizadas

#### 1. `frontend/src/pages/admin/PaginaAdminCarouselEdit.tsx`
**Mudanças**:
- Importa `ImageUploadField` para foto de evento
- Importa `validateImage` para validação de carousel
- Validação de imagens ANTES do upload
- Upload de foto de perfil com novo componente
- Upload de imagem do slide com novo componente

**Contextos usados**:
- `CAROUSEL` - para imagem principal
- `CAROUSEL_EVENT` - para foto de perfil (quando é evento)

#### 2. `frontend/src/pages/admin/PaginaAdminCriarComunicado.tsx`
**Mudanças**:
- Importa `ImageUploadField` para anexo
- Importa `validateImage` para validação
- Validação de imagens ANTES do upload
- Upload de anexo com novo componente

**Contextos usados**:
- `COMUNICADO` - para imagem anexada

#### 3. `frontend/src/components/Carousel/Carousel.tsx`
**Mudanças**:
- Estrutura HTML melhorada com wrapper
- Classes CSS para controle de proporção
- Lazy loading de imagens
- `object-fit: cover` para garantir encaixe

#### 4. `frontend/src/pages/PaginaAnuncio.tsx`
**Mudanças**:
- Wrapper para hero image com classe
- Classes CSS para dimensionamento correto
- Lazy loading

#### 5. `frontend/src/pages/PaginaComunicados.tsx`
**Mudanças**:
- Adiciona classe `comunicadoImageWrapper` para proporção correta
- Classe `comunicadoCom__image` para objeto-fit correto
- Lazy loading de imagens

---

## 📱 Componente `ImageUploadField`

### Uso Básico

```tsx
import { ImageUploadField } from "../../components/ImageUploadField/ImageUploadField";

export function MeuComponente() {
    const [file, setFile] = useState<File | null>(null);

    return (
        <ImageUploadField
            label="Sua Imagem"
            context="CAROUSEL" // ou "CAROUSEL_EVENT", "COMUNICADO", etc
            selectedFile={file}
            onFileSelect={setFile}
            showRecommendations={true}
            maxFileSize={5 * 1024 * 1024} // 5MB padrão
        />
    );
}
```

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `label` | string | "Imagem" | Rótulo do campo |
| `context` | enum | - | Um dos contextos: CAROUSEL, CAROUSEL_EVENT, COMUNICADO, THUMBNAIL, HERO |
| `selectedFile` | File \| null | null | Arquivo selecionado |
| `onFileSelect` | (file: File \| null) => void | - | Callback quando arquivo muda |
| `preview` | string \| null | null | URL de prévia (para edição) |
| `disabled` | boolean | false | Desabilita o campo |
| `maxFileSize` | number | 5MB | Tamanho máximo em bytes |
| `showRecommendations` | boolean | true | Mostra recomendações |
| `className` | string | "" | Classes CSS adicionais |

---

## 🔍 Função `validateImage`

```tsx
import { validateImage, type ImageValidationResult } from "../../utils/imageValidation";

const result = await validateImage(file, "CAROUSEL", 5 * 1024 * 1024);

if (!result.isValid) {
    console.error(result.error); // "Imagem muito pequena. Mínimo: 800x400..."
} else {
    console.log(result.dimensions); // { width: 1200, height: 600, aspectRatio: 2 }
}
```

---

## 🎨 CSS para Exibição Perfeita

### Classes disponíveis em `imageDisplay.css`:

```css
/* Wrappers com aspect ratio automático */
.carousel__imageWrapper      /* 16:9 → 4:3 → 16:9 responsivo */
.eventProfile__wrapper       /* 1:1 quadrado */
.comunicadoImageWrapper      /* 4:3 */
.announcementCard__imageWrapper /* 16:9 */

/* Imagens otimizadas */
.carousel__image             /* cover, center */
.eventProfile__image         /* cover, center */
.comunicadoCom__image        /* contain, center */
```

### Exemplo de uso em HTML:

```html
<!-- Carrossel -->
<div class="carousel__imageWrapper">
    <img src="..." class="carousel__image" />
</div>

<!-- Evento -->
<div class="eventProfile__wrapper">
    <img src="..." class="eventProfile__image" />
</div>

<!-- Comunicado -->
<div class="comunicadoImageWrapper">
    <img src="..." class="comunicadoCom__image" />
</div>
```

---

## ✅ Checklist de Validação

Quando o usuário faz upload:

1. ✅ Verifica se é arquivo de imagem
2. ✅ Valida tamanho do arquivo (máximo)
3. ✅ Valida tamanho mínimo (pixels)
4. ✅ Valida proporção/aspect ratio
5. ✅ Mostra dimensões atuais
6. ✅ Mostra % de correspondência com ideal
7. ✅ Exibe preview responsivo
8. ✅ Sugere tamanho perfeito para o contexto

---

## 🚀 Próximos Passos

### Para adicionar validação em outras páginas:

1. **Importe o utilitário**:
   ```tsx
   import { ImageUploadField } from "../../components/ImageUploadField/ImageUploadField";
   import { validateImage } from "../../utils/imageValidation";
   ```

2. **Escolha o contexto** apropriado (veja lista acima)

3. **Use o componente**:
   ```tsx
   <ImageUploadField
       context="DOCUMENTO" // seu contexto
       selectedFile={file}
       onFileSelect={setFile}
   />
   ```

4. **Valide antes de enviar**:
   ```tsx
   const validation = await validateImage(file, "DOCUMENTO", maxSize);
   if (!validation.isValid) {
       setErro(validation.error);
       return;
   }
   ```

5. **Adicione CSS** da classe personalizada em `imageDisplay.css`

---

## 📚 Exemplo Completo

```tsx
import { useState } from "react";
import { ImageUploadField } from "./ImageUploadField";
import { validateImage } from "../../utils/imageValidation";

export function MeuUploadCustomizado() {
    const [file, setFile] = useState<File | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    async function salvar() {
        if (!file) return;

        // Validar
        const validation = await validateImage(file, "CAROUSEL", 5 * 1024 * 1024);
        if (!validation.isValid) {
            setErro(validation.error);
            return;
        }

        // Enviar
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            console.log("✅ Upload bem-sucedido:", data);
        } catch (e) {
            setErro("Erro ao enviar imagem");
        } finally {
            setUploading(false);
        }
    }

    return (
        <div>
            <ImageUploadField
                label="Imagem de Destaque"
                context="CAROUSEL"
                selectedFile={file}
                onFileSelect={setFile}
                showRecommendations={true}
            />

            {erro && <div className="erro">{erro}</div>}

            <button onClick={salvar} disabled={!file || uploading}>
                {uploading ? "Enviando..." : "Salvar"}
            </button>
        </div>
    );
}
```

---

## 🐛 Troubleshooting

### Problema: Imagem fica distorcida
**Solução**: Verifique se está usando a classe CSS correta com `object-fit: cover` ou `contain`

### Problema: Imagem muito pequena/grande na tela
**Solução**: Ajuste o `aspect-ratio` do wrapper ou use as classes pré-definidas

### Problema: Validação muito rigorosa
**Solução**: Edite os valores em `imageValidation.ts` na seção `imageRecommendations`

### Problema: Imagem não carrega
**Solução**: Adicione `loading="lazy"` e verifique se a URL está correta

---

**Data**: 27/03/2026
**Versão**: 1.0
**Status**: Pronto para produção

