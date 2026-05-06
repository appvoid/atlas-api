# Atlas: Guia Practica para Entender el Proyecto

Este documento explica Atlas con palabras simples, pero usando la estructura real del repositorio actual. Si estas empezando, te sirve para entender que hace la API, donde vive cada pieza y como ponerla a correr sin perderte.

## La idea general

Atlas es una API que recibe tickets de soporte y decide a que tema pertenecen.

Ejemplos:

- "Me cobraron dos veces" -> `Facturacion`
- "No puedo iniciar sesion" -> `Acceso a Cuenta`
- "La app se congela" -> `Problema Tecnico`

La API no usa reglas fijas tipo `if texto incluye "pago"`. En vez de eso, convierte el texto en un vector numerico usando `CrispEmbed`, compara ese vector contra ejemplos de temas y elige el tema mas parecido.

Tambien puede guardar los tickets clasificados en SQLite para luego listarlos, consultarlos, actualizarlos o eliminarlos.

## Como piensa Atlas

La logica del clasificador se puede resumir asi:

1. Cada tema tiene varios ejemplos en `src/topics.js`.
2. Esos ejemplos se convierten en embeddings.
3. Cuando llega un ticket nuevo, Atlas genera otro embedding para el texto recibido.
4. Compara el ticket contra todos los ejemplos.
5. El tema cuyo ejemplo quede mas cerca gana.

La respuesta final siempre trae:

- `tema`: la categoria elegida
- `confianza`: la similitud redondeada a 4 decimales

## Estructura real del proyecto

### `src/server.js`

Es el punto de arranque.

Hace cuatro cosas importantes:

1. Crea la base de datos SQLite.
2. Crea el repositorio que guarda tickets.
3. Prepara el cliente de `CrispEmbed`.
4. Levanta la API HTTP con Express.

Tambien inicia el clasificador en segundo plano y cierra todo ordenadamente cuando el proceso recibe `SIGINT` o `SIGTERM`.

### `src/app.js`

Aqui viven los endpoints.

Los principales son:

- `GET /salud`
- `POST /clasificar`
- `POST /tickets`
- `GET /tickets`
- `GET /tickets/:id`
- `PUT /tickets/:id`
- `DELETE /tickets/:id`

Tambien estan aqui:

- La validacion de `apiKey`
- La proteccion para no clasificar mientras el modelo sigue cargando
- El manejo de errores JSON y errores del clasificador

### `src/topics.js`

Este archivo define los temas base y sus ejemplos.

Ejemplo simplificado:

```js
const DEFAULT_TOPICS = {
  Facturacion: [
    'Pagos, cobros, facturas y reembolsos.',
  ],
  'Problema Tecnico': [
    'Errores, fallos del sistema y bugs.',
  ],
};
```

Si quieres cambiar el comportamiento del clasificador sin tocar la logica interna, este es uno de los lugares mas importantes. Mejorar ejemplos suele dar mas resultado que complicar el codigo.

### `src/services/supportClassifier.js`

Este es el cerebro del proyecto.

Responsabilidades:

- Iniciar el cliente de embeddings
- Cargar o generar el cache de vectores de los temas
- Clasificar tickets
- Permitir ejemplos personalizados por request

Cuando el archivo `data/prompt-vectors.json` ya existe y coincide con el modelo + temas actuales, Atlas lo reutiliza para no recalcular todo en cada arranque.

### `src/services/crispEmbedProcessClient.js`

Este archivo se comunica con `CrispEmbed`.

Puede trabajar de dos formas:

- Levantando un subproceso local con `crispembed-server`
- Apuntando a un servidor de embeddings ya existente con `CRISPEMBED_SERVER_URL`

Tambien espera a que el servicio responda por salud antes de dejar el clasificador disponible.

### `src/db/database.js`

Aqui se crea la base SQLite y la tabla `tickets`.

La tabla guarda:

- `texto`
- `tema`
- `confianza`
- `instruccion`
- `ejemplos_json`
- `created_at`
- `updated_at`

### `src/repositories/ticketsRepository.js`

Encapsula el acceso a la base de datos.

En vez de escribir SQL directo por toda la app, este archivo centraliza:

- crear tickets
- listar tickets
- buscar por id
- actualizar tickets
- eliminar tickets

### `src/utils/validation.js`

Valida lo que llega en los requests.

Comprueba, por ejemplo:

- que `texto` exista cuando es obligatorio
- que `instruccion` sea string o `null`
- que `ejemplos` tenga formato correcto
- que el `id` del ticket sea valido

## Flujo completo de un ticket

### Caso 1: solo clasificar

1. Un cliente hace `POST /clasificar`.
2. Envia `apiKey` y un JSON con `texto`.
3. Express valida el body.
4. `SupportClassifier` genera el embedding del ticket.
5. Compara contra los temas base o contra `ejemplos` enviados en ese request.
6. Responde con `tema` y `confianza`.

### Caso 2: clasificar y guardar

1. Un cliente hace `POST /tickets`.
2. Atlas clasifica el ticket igual que en `/clasificar`.
3. El resultado se inserta en SQLite.
4. La API devuelve el ticket persistido con `id`, fechas y clasificacion.

### Caso 3: actualizar un ticket

1. Un cliente hace `PUT /tickets/:id`.
2. Atlas busca el ticket existente.
3. Mezcla lo viejo con lo nuevo.
4. Reclasifica usando el contenido actualizado.
5. Guarda el nuevo resultado en SQLite.

## Autenticacion

Casi todos los endpoints usan una API key.

Por defecto:

- Header: `apiKey`
- Valor: `sk-atlas-123`

Eso se puede cambiar con variables de entorno:

- `ATLAS_API_KEY`
- `ATLAS_API_KEY_HEADER`

El endpoint `GET /salud` no requiere autenticacion.

## Variables de entorno importantes

Estas son las mas utiles para desarrollo local:

```env
PORT=8000
HOST=0.0.0.0
ATLAS_API_KEY=sk-atlas-123
DATABASE_PATH=./data/atlas.sqlite
PROMPT_VECTORS_PATH=./data/prompt-vectors.json
CRISPEMBED_THREADS=1
```

Ademas, Atlas puede usar:

- `CRISPEMBED_MODEL`: ruta a un `.gguf` o alias de modelo
- `CRISPEMBED_SERVER_BINARY`: ruta al binario `crispembed-server`
- `CRISPEMBED_SERVER_URL`: URL de un servidor CrispEmbed ya corriendo
- `CRISPEMBED_PORT`: puerto del servidor local de embeddings

## Como correr el proyecto localmente

### 1. Instalar dependencias

```bash
npm install
```

### 2. Compilar CrispEmbed

```bash
npm run build:crispembed
```

Si la carpeta `CrispEmbed/` no existe, el script la clona automaticamente antes de compilar.

### 3. Tener un modelo disponible

Atlas intenta usar en este orden:

1. `CrispEmbed/e5.gguf`
2. `CrispEmbed/es_q8_0.gguf`
3. `multilingual-e5-small`

Para evitar sorpresas, lo recomendable es descargar `CrispEmbed/e5.gguf`.

### 4. Levantar la API

```bash
npm start
```

Para desarrollo con reinicio automatico:

```bash
npm run dev
```

## Pruebas

Las pruebas estan en `tests/`.

- `tests/api.test.js`: valida salud, auth, clasificacion y CRUD
- `tests/supportClassifier.test.js`: valida la logica del clasificador y el cache de vectores

Ejecutarlas:

```bash
npm test
```

## Endpoints mas utiles

### `GET /salud`

Respuesta esperada:

```json
{
  "estado": "ok",
  "modelo": "cargado",
  "hilos": 1,
  "baseDatos": "ok"
}
```

### `POST /clasificar`

```bash
curl -X POST http://localhost:8000/clasificar \
  -H "apiKey: sk-atlas-123" \
  -H "Content-Type: application/json" \
  -d '{"texto":"Me cobraron dos veces este mes"}'
```

### `POST /tickets`

```bash
curl -X POST http://localhost:8000/tickets \
  -H "apiKey: sk-atlas-123" \
  -H "Content-Type: application/json" \
  -d '{"texto":"No puedo hacer login en mi cuenta"}'
```

## Despliegue recomendado: GitHub + Render

La guia anterior de PythonAnywhere ya no aplica a este repo. Este proyecto ya trae `render.yaml`, asi que el camino natural es Render.

### 1. Subir a GitHub

Si todavia no has creado el repo remoto:

```bash
git init
git add .
git commit -m "Inicial"
git branch -M main
git remote add origin https://github.com/tu-usuario/atlas.git
git push -u origin main
```

Si ya existe un repo local, no repitas `git init`; solo agrega el remoto y haz `push`.

### 2. Crear el servicio en Render

1. Conecta tu cuenta de GitHub en Render.
2. Crea un nuevo `Web Service`.
3. Selecciona este repositorio.
4. Render detectara `render.yaml`.

### 3. Que hace `render.yaml`

El archivo ya define:

- runtime `node`
- `buildCommand` con `npm install`
- compilacion de `CrispEmbed`
- descarga del modelo `e5.gguf`
- variables de entorno base
- `startCommand: npm start`

### 4. Que revisar al desplegar

Verifica que Render tenga:

- una `ATLAS_API_KEY` segura
- espacio para el archivo SQLite en `data/`
- tiempo suficiente para compilar `CrispEmbed`

## Resumen rapido

- `src/app.js` expone la API.
- `src/services/supportClassifier.js` decide el tema.
- `src/services/crispEmbedProcessClient.js` habla con CrispEmbed.
- `src/repositories/ticketsRepository.js` guarda y recupera tickets.
- `src/topics.js` define los ejemplos que guian la clasificacion.
- `tests/` valida que la API y el clasificador sigan funcionando.

Si vas a tocar una sola cosa para mejorar resultados, empieza por `src/topics.js`. Si vas a depurar la API, empieza por `src/app.js` y `src/server.js`.
