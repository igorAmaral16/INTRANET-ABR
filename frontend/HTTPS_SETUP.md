# Frontend HTTPS - Guia para Produção

## Sistema está rodando em HTTPS na rede interna

- **Frontend:** `https://10.0.0.48:5175`
- **Backend:** `https://10.0.0.48:5443`
- **Certificados:** mkcert (gerados no Windows, portáveis)

## Configuração em Produção (Windows)

O frontend deve estar compilado e servido pelo backend (build estático) ou via um servidor web separado.

### Opção 1: Frontend compilado e servido pelo backend

Se você quiser servir o frontend pelo mesmo servidor Express:

```bash
npm run build  # cria dist/
```

Adicione ao `backend/src/app.js`:

```javascript
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Servir assets estáticos (vercel, etc)
app.use(express.static(path.join(__dirname, "../../frontend/dist")));

// SPA fallback: /api/* e /socket.io vão para rotas, resto vai pra index.html
app.get("*", (req, res) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/socket.io")) {
        res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
    }
});
```

Nesse caso:
- Frontend acessa `https://10.0.0.48:5443` (mesma origem que backend)
- Todas as APIs e websockets funcionam automaticamente
- `window.location.origin` será `https://10.0.0.48:5443`

### Opção 2: Frontend e Backend separados (via proxy reverso)

Se o Vite continuar rodando em 5175:

**Frontend `.env.production`:**
```env
VITE_API_BASE_URL=https://10.0.0.48:5443
```

**vite.config.js** (para build):
```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    target: "ES2020",
    minify: "terser",
  },
  // sem https/proxy em produção (isso é build estático)
});
```

Depois:
```bash
npm run build
```

Copie `dist/` para um diretório servido por nginx/Apache/IIS apontando HTTPS para 10.0.0.48:5175.

---

## Acessar do macOS (teste)

Se você precisar testar no macOS:

1. **Instale a CA do mkcert:**
```bash
brew install mkcert
mkcert -install
```

2. **Acesse a aplicação:**
```
https://10.0.0.48:5175 (frontend)
https://10.0.0.48:5443 (backend, se separado)
```

O navegador agora confiará nos certificados porque a CA raiz foi instalada via `mkcert -install`.

---

## Diferença entre vite.config.js (dev vs build)

**Desenvolvimento** (Windows `npm run dev`):
- Vite serve em `https://10.0.0.48:5175`
- Proxy reverso redireciona `/api` → `https://10.0.0.48:5443`
- Certificates no vite.config.js
- `NODE_ENV=development`, logs verbosos

**Produção** (`npm run build` + servidor web):
- Build estático sem Vite
- Servido por nginx/Apache/IIS ou pelo backend Express
- Nenhuma configuração de dev

---

## CORS em Produção

Backend valida:
```
CORS_ORIGINS=https://10.0.0.48:5175
```

Se frontend muda de URL, atualize esta variável. Sem ela, requisições serão bloqueadas.

---

**Sistema está em produção. Não altere certificados sem comunicação.**

