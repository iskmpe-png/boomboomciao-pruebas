# Boom Boom Ciao · gestión de cocina

Aplicación web para llevar la cocina de un restaurante: escandallos, precios de proveedores,
recetas, inventario, mermas, compras, pedidos, APPCC, producción y un asistente con IA.
Funciona en móvil, tableta y ordenador, se puede instalar como app y sigue funcionando sin conexión.

## Cómo está hecha

- **Sin paso de compilación.** Es HTML, CSS y JavaScript tal cual: lo que hay en el repositorio es lo que se publica.
- **Base de datos y usuarios:** [Supabase](https://supabase.com) (PostgreSQL). Cada restaurante tiene sus datos separados
  y la propia base de datos decide qué puede leer y escribir cada usuario (Row Level Security).
- **IA:** una función en el servidor (`supabase/funciones/ia`) hace de puente con Gemini. La clave de la IA nunca llega al navegador.
- **Alojamiento:** GitHub Pages.

## Carpetas

| Carpeta | Qué contiene |
| --- | --- |
| `index.html` | La estructura de la página y la lista ordenada de archivos que carga. |
| `config.js` | La configuración del entorno (producción o pruebas). Es lo único que cambia entre uno y otro. |
| `css/` | Estilos: `base.css` (colores, tipografía, cabecera), `componentes.css`, `pantallas.css`, `novedades.css`. |
| `js/nucleo/` | Lo común: modelo de datos, cálculo de costes, guardado, permisos, navegación. |
| `js/pantallas/` | Una pantalla por archivo: carta, ficha, precios, inventario, mermas, pedidos, historial, grupo… |
| `js/ia/` | Asistente, manual de la casa, escáner de albaranes, ventas e importación de tarifas. |
| `js/exportar/` | Informes en PNG, PDF y Excel. |
| `js/datos/` | Copia de seguridad y deshacer. |
| `js/nube/` | Sesión, entrada, usuarios, sincronización con Supabase, modo sin conexión, límite de IA. |
| `js/eventos/` | Lo que pasa al pulsar botones y enviar formularios de las pantallas principales. |
| `js/utilidades/` | Lectura de documentos (Excel, PDF, fotos), imágenes y dictado. |
| `vendor/` | Librerías de terceros incluidas en el repositorio: supabase-js, SheetJS y pdf.js. |
| `img/` | Logo e iconos de la app. |
| `supabase/migraciones/` | Los scripts de la base de datos, numerados en el orden en que se ejecutan. |
| `supabase/funciones/ia/` | El código de la función de IA. |
| `sw.js` | Guarda la app en el dispositivo para que abra sin conexión. |

Los archivos de `js/` se cargan en el orden que marca `index.html` y comparten ámbito: cada uno usa lo que
definen los anteriores. No son módulos ES; es una decisión para no depender de herramientas de compilación.

## Poner en marcha un entorno nuevo

1. Crear un proyecto en Supabase y ejecutar, en orden, los scripts de `supabase/migraciones/`.
2. En **Authentication → URL Configuration**, poner la dirección pública de la app.
3. Crear la función `ia` con el contenido de `supabase/funciones/ia/index.ts` y guardar el secreto `GEMINI_API_KEY`.
4. Rellenar `config.js` con la dirección del proyecto y su clave **publishable**.
5. Publicar el repositorio con GitHub Pages (rama `main`, carpeta raíz).

La primera cuenta que cree un restaurante queda como administradora de la plataforma.

## Seguridad

- En el repositorio no hay secretos. La clave de `config.js` es la pública: está pensada para ir en el navegador
  y no da acceso a nada por sí sola.
- El control de acceso está en la base de datos, no en la app: aunque alguien modifique el código del navegador,
  solo puede leer y escribir lo que su rol permite.
- Roles: dueño, encargado, cocina y solo consulta. El historial de cambios lo escribe la base de datos y no se puede alterar desde la app.
- La página declara una política de seguridad de contenido (CSP) que solo permite cargar código del propio sitio.
- Las claves **secret / service_role** de Supabase y la de Gemini no deben subirse nunca a este repositorio.

## Al publicar cambios

Subir el número de versión en `sw.js` (`CACHE = 'bbc-vN'`) para que los dispositivos descarguen la versión nueva,
y probar primero en el entorno de pruebas.
