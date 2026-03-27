# 🎞 Cinepodio

Podio de películas vistas en Letterboxd. Ranking automático del año en curso.

## Deploy en Vercel (gratis, ~5 minutos)

### Paso 1 — Subir el código a GitHub

1. Entrá a [github.com](https://github.com) y creá una cuenta si no tenés
2. Hacé clic en **"New repository"** (botón verde arriba a la derecha)
3. Ponele de nombre `cinepodio`, dejalo en **Public**, y hacé clic en **"Create repository"**
4. En la página del repo vacío, hacé clic en **"uploading an existing file"**
5. Arrastrá **todos los archivos** de esta carpeta (respetando la estructura):
   ```
   cinepodio/
   ├── api/
   │   └── letterboxd.js
   ├── public/
   │   └── index.html
   ├── package.json
   └── vercel.json
   ```
6. Hacé clic en **"Commit changes"**

### Paso 2 — Deployar en Vercel

1. Entrá a [vercel.com](https://vercel.com) y creá una cuenta con tu cuenta de GitHub
2. Hacé clic en **"Add New Project"**
3. Buscá tu repo `cinepodio` y hacé clic en **"Import"**
4. No toques nada, dejá todo por defecto y hacé clic en **"Deploy"**
5. Esperá ~1 minuto. Vercel te va a dar una URL del estilo `cinepodio.vercel.app`

¡Listo! La app ya está online y funciona desde cualquier dispositivo.

---

## Cómo usar

- Escribí un usuario de Letterboxd y apretá Enter o "+ agregar"
- La app busca automáticamente cuántas películas vio ese usuario en el año actual
- El podio se actualiza en tiempo real
- El botón ↻ actualiza el conteo de un usuario
- El botón ✕ elimina un usuario del podio

**Requisito:** el perfil de Letterboxd tiene que ser público.

---

## Estructura del proyecto

```
api/letterboxd.js   → Servidor que scrapea Letterboxd (corre en Vercel Edge)
public/index.html   → La app web completa
package.json        → Dependencias (node-html-parser)
vercel.json         → Configuración de rutas de Vercel
```
# Cinepodio
