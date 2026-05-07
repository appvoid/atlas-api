# Atlas

<img src="https://github.com/appvoid/atlas-api/blob/main/atlas.png?raw=true"/>

API para clasificar y gestionar tickets de soporte usando JavaScript, Express, SQLite, Valibot y CrispEmbed.

## Que hace

- `GET /salud` muestra si la API esta viva y si el clasificador ya esta listo.
- `POST /clasificar` recibe un ticket, lo clasifica y devuelve `tema` + `confianza`.
- `POST /tickets` clasifica y guarda un ticket.
- `GET /tickets`, `GET /tickets/:id`, `PUT /tickets/:id` y `DELETE /tickets/:id` administran los tickets guardados.

## Ejemplo basico

```bash
curl -X POST localhost:8000/clasificar \
  -H "apiKey: sk-atlas-123" \
  -H "Content-Type: application/json" \
  -d '{"texto":"No puedo entrar a mi cuenta"}'
```

## Como esta armado

- `Express` expone la API HTTP.
- `better-sqlite3` guarda los tickets en SQLite con una API simple y sincronica.
- `Valibot` valida los cuerpos JSON sin llenar las rutas de `if` repetidos.
- `CrispEmbed` genera embeddings para comparar el texto del ticket contra ejemplos por tema.
- Un router CRUD generico crea casi todas las rutas de recursos a partir de una sola configuracion.

## Requisitos

- `Node.js >= 22.5`
- `CMake`
- Toolchain C/C++ para compilar `CrispEmbed`
- Un modelo `.gguf`, por ejemplo `CrispEmbed/e5.gguf`

## Instalacion

```bash
npm install
npm run build:crispembed
```

## Ejecucion

```bash
npm start
```

Para desarrollo con recarga automatica:

```bash
npm run dev
```

## Pruebas

```bash
npm test
```

## Variables de entorno

| Variable | Default | Descripcion |
|---|---|---|
| `PORT` | `8000` | Puerto del API |
| `HOST` | `0.0.0.0` | Host del API |
| `ATLAS_API_KEY` | `sk-atlas-123` | API key requerida |
| `ATLAS_API_KEY_HEADER` | `apiKey` | Nombre del header |
| `DATABASE_PATH` | `data/atlas.sqlite` | Ruta del archivo SQLite |
| `PROMPT_VECTORS_PATH` | `data/prompt-vectors.json` | Cache local de vectores de temas |
| `CRISPEMBED_MODEL` | `CrispEmbed/e5.gguf` si existe | Modelo o alias de modelo |
| `CRISPEMBED_THREADS` | `1` | Hilos para `crispembed-server` |
| `CRISPEMBED_SERVER_BINARY` | `CrispEmbed/build/crispembed-server` | Binario del servidor |
| `CRISPEMBED_SERVER_URL` | vacio | URL de un servidor ya levantado |
| `CRISPEMBED_PORT` | `8091` | Puerto local de CrispEmbed |

## Flujo de clasificacion

1. Atlas prepara o reutiliza un servidor de embeddings.
2. Carga ejemplos base por tema desde `src/temas.js`.
3. Convierte cada ejemplo y cada ticket en vectores numericos.
4. Busca el tema cuyo ejemplo quede mas cerca del ticket.
5. Si la ruta era `/tickets`, ademas guarda el resultado en SQLite.
