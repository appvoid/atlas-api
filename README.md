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

## Flujo de clasificacion

<img src="https://github.com/appvoid/atlas-api/blob/main/flujo.png?raw=true"/>

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
