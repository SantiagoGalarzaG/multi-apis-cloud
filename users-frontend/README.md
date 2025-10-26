# users-frontend

Frontend mínimo (HTML/CSS/JS plano) para consumir `users-api`.

## Endpoints soportados
Usa los endpoints existentes en `users-api/src/app.js`:

- GET `/users` — Listar usuarios
- POST `/users` — Crear usuario `{ name, email }`
- PUT `/users/:id` — Actualizar `{ name, email }`
- DELETE `/users/:id` — Eliminar por id

## Cómo ejecutar

1) Levanta la API (Docker Compose recomendado):

```bash
# desde la raíz del repo
docker compose up --build
```

Esto expone `users-api` en `http://localhost:4001`.

2) Abre el frontend:

- Opción A: Abre `users-frontend/index.html` directamente en el navegador. CORS está habilitado en la API, por lo que funcionará.
- Opción B (recomendado): Sirve la carpeta con un servidor estático. Por ejemplo, con la extensión "Live Server" del IDE, o con `npm`:

```bash
# usando npx http-server (necesita Node.js instalado)
npx http-server users-frontend -p 5173 -o
```

3) En la parte superior del frontend puedes configurar el "API Base URL" si tu backend no corre en `http://localhost:4001`. Se guarda en `localStorage` y se recuerda entre sesiones.

## Funcionalidades

- Crear usuario con formulario.
- Listado de usuarios con actualización manual.
- Edición en línea por fila (nombre y email).
- Eliminación con confirmación.
- Manejo básico de errores y estados de carga.

## Estructura

```
users-frontend/
  index.html   # layout y elementos de UI
  styles.css   # estilos sencillos (sin frameworks)
  app.js       # lógica para consumir la API y manipular el DOM
```

## Notas

- Si decides cambiar el puerto o ruta base del backend, actualízalo desde el control de "API Base URL" en el header.
- Si más adelante prefieres un framework (React/Vite), puedo migrar este frontend manteniendo funcionalidad y estilos.
