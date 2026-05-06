# Atlas

API para clasificar y gestionar tickets de soporte usando `Node.js`, `Express`, `SQLite` y `CrispEmbed`.

## Arquitectura

- `Express` expone la API HTTP.
- `SQLite` persiste los tickets clasificados en un archivo local.
- `CrispEmbed` corre como subproceso local (`crispembed-server`) y Atlas lo usa para generar embeddings.
- La clasificacion sigue siendo zero-shot por similitud coseno contra anclas tematicas.

## Requisitos

- `Node.js >= 22.5`
- `CMake`
- Toolchain C/C++ para compilar `CrispEmbed`
- Modelo gguf como CrispEmbed/e5.gguf ([descarga aquí](https://huggingface.co/appvoid/e5-gguf/tree/main))

## Instalacion

```bash
npm install
npm run build:crispembed
```

Si `CrispEmbed/` no existe, `npm run build:crispembed` lo clona automaticamente antes de compilar.

## Ejecucion

```bash
npm start
```

La API levanta por defecto en `http://0.0.0.0:8000`.

Por defecto, Atlas intenta usar `CrispEmbed/e5.gguf`. Si ese archivo no existe, usa `CrispEmbed/es_q8_0.gguf`. Solo si ninguno de los dos esta presente cae al alias remoto `multilingual-e5-small`.

## Variables de entorno

| Variable | Default | Descripcion |
|---|---|---|
| `PORT` | `8000` | Puerto del API |
| `HOST` | `0.0.0.0` | Host del API |
| `ATLAS_API_KEY` | `sk-atlas-123` | API key requerida |
| `ATLAS_API_KEY_HEADER` | `apiKey` | Nombre del header |
| `DATABASE_PATH` | `data/atlas.sqlite` | Ruta del archivo SQLite |
| `PROMPT_VECTORS_PATH` | `data/prompt-vectors.json` | Cache local de embeddings de anclas |
| `CRISPEMBED_MODEL` | `CrispEmbed/e5.gguf` si existe | Alias de modelo o ruta `.gguf` |
| `CRISPEMBED_THREADS` | `1` | Hilos para `crispembed-server` |
| `CRISPEMBED_SERVER_BINARY` | `CrispEmbed/build/crispembed-server` | Binario del servidor de embeddings |
| `CRISPEMBED_SERVER_URL` | vacío | URL de un `crispembed-server` ya levantado |
| `CRISPEMBED_PORT` | `8091` | Puerto del subproceso `crispembed-server` |

## Endpoints

### `GET /salud`

No requiere autenticacion.

Respuesta ejemplo:

```json
{
  "estado": "ok",
  "modelo": "cargado",
  "hilos": 1,
  "baseDatos": "ok"
}
```

Durante el primer arranque puede responder temporalmente con `"modelo": "cargando"` mientras `CrispEmbed` descarga o carga el modelo.

### `POST /clasificar`

Clasifica un ticket sin persistirlo.

Si el modelo todavia se esta inicializando, responde `503` en lugar de dejar la conexion colgada.

Headers:

```http
apiKey: sk-atlas-123
Content-Type: application/json
```

Body:

```json
{
  "texto": "Me cobraron dos veces este mes",
  "instruccion": "query: ",
  "ejemplos": {
    "Facturacion": ["cargo duplicado", "problema con factura"]
  }
}
```

Respuesta:

```json
{
  "tema": "Facturacion",
  "confianza": 0.95
}
```

### `POST /tickets`

Clasifica y persiste un ticket.

Igual que `POST /clasificar`, responde `503` si el modelo aun no termino de cargar.

```bash
curl -X POST http://localhost:8000/tickets \
  -H "apiKey: sk-atlas-123" \
  -H "Content-Type: application/json" \
  -d '{"texto":"No puedo hacer login"}'
```

Respuesta ejemplo:

```json
{
  "id": 1,
  "texto": "No puedo hacer login",
  "tema": "Acceso a Cuenta",
  "confianza": 0.91,
  "instruccion": null,
  "ejemplos": null,
  "createdAt": "2026-05-06T18:00:00.000Z",
  "updatedAt": "2026-05-06T18:00:00.000Z"
}
```

### `GET /tickets`

Lista todos los tickets persistidos.

### `GET /tickets/:id`

Obtiene un ticket por id.

### `PUT /tickets/:id`

Actualiza un ticket y lo reclasifica con el nuevo contenido. Puedes enviar `texto`, `instruccion`, `ejemplos` o cualquier combinacion de esos campos.

### `DELETE /tickets/:id`

Elimina un ticket persistido.

## Pruebas

```bash
npm test
```

## Flujo interno de clasificacion

1. Atlas inicia `crispembed-server` con el modelo configurado.
2. Se calculan o reutilizan los embeddings cacheados de los temas base.
3. Cada ticket se embebe con el prefijo `query: ` o la `instruccion` enviada.
4. Se escoge el tema con mayor similitud coseno.
5. Si la llamada fue a `POST /tickets` o `PUT /tickets/:id`, el resultado se guarda en SQLite.
