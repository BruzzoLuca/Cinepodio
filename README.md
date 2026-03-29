# 🎞 Cinepodio

Podio de películas vistas en Letterboxd. Ranking automático del año en curso.

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
