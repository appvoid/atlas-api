# Atlas — API Clasificadora de Tickets de Soporte

Puedes probar la demo enviando peticiones a appvoid.pythonanywhere.com

> [!NOTE]
> **Migración de Arquitectura:** Atlas ha sido migrado de FastAPI + PyTorch a **Flask + CrispEmbed**. Este cambio se realizó para facilitar el despliegue en entornos de desarrollo (como PythonAnywhere), eliminando dependencias pesadas y reduciendo el consumo de recursos sin perder precisión.

Atlas es una API ultra-ligera y eficiente construida con **Flask** y **CrispEmbed** que clasifica textos de tickets de soporte en diferentes temas. Utiliza un binario de C++ (CrispEmbed) para manejar modelos de embeddings en formato GGUF, lo que reduce drásticamente el consumo de memoria y elimina la dependencia de PyTorch (~2GB).

## Cómo Funciona

Atlas utiliza **clasificación zero-shot mediante similitud de embeddings** aprovechando el modelo `es_q8_0.gguf` (optimizado para español):

1. **Al iniciar**, el modelo carga los pesos desde un archivo `.gguf` local y precomputa los embeddings de referencia (**modo passage**) para un conjunto de anclas representativas por tema definidas en `app/temas.py`.
2. **En cada solicitud**, el texto del ticket entrante se codifica en un embedding usando el prefijo de consulta (**modo query**): `query: <texto>`.
3. Se calcula la **similitud del coseno** (producto punto sobre vectores normalizados) entre el embedding del ticket y cada ancla de referencia. El tema con el valor máximo de similitud es el seleccionado.

Este enfoque es extremadamente rápido y consume muy poca RAM (aprox. 300MB), siendo ideal para despliegues en entornos limitados como **PythonAnywhere**. Se recomienda usar `n_threads=1` en producción para evitar contención de recursos.

### Temas Soportados

| Tema (Topic) | Descripción / Anclas de Referencia |
|---|---|
| Facturacion | Pagos, cobros, reembolsos, facturas, errores bancarios y suscripciones. |
| Problema Tecnico | Fallos de sistema, errores HTTP, bugs en la app, problemas de UI y webhooks. |
| Acceso a Cuenta | Login, contraseñas, bloqueos de perfil, MFA/2FA y gestión de usuarios. |
| Solicitud de Funcion | Sugerencias, nuevas herramientas, integraciones y mejoras de diseño. |
| Consulta General | Documentación, guías, horarios, legal y dudas generales de inicio. |

## Configuración

1. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```



## Ejecutar la API

Desde la raíz del proyecto, puedes usar cualquiera de estos comandos:

**Opción 1: Python directo**
```bash
python app/main.py
```

**Opción 2: Flask CLI**
```bash
flask --app app/main.py run --port 8000
```

La API se ejecutará por defecto en `http://0.0.0.0:8000`.

## Uso

### `POST /clasificar`

Requiere el encabezado `apiKey`. Clave predeterminada: `sk-atlas-123`.

#### Parámetros de la Petición

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `texto` | `string` | Sí | El texto del ticket de soporte a clasificar. |
| `instruccion` | `string` | No | Una instrucción personalizada que reemplaza el prefijo predeterminado del modelo. |
| `ejemplos` | `dict` | No | Un diccionario de temas y sus ejemplos (`{"Tema": ["ejemplo1", "ejemplo2"]}`) que reemplaza los temas por defecto. |

#### Ejemplo Básico

```bash
curl -X POST "http://localhost:8000/clasificar" \
     -H "apiKey: sk-atlas-123" \
     -H "Content-Type: application/json" \
     -d '{"texto": "Mi servidor se bloquea al subir archivos grandes."}'
```

**Respuesta:**

```json
{
  "tema": "Problema Tecnico",
  "confianza": 0.8942
}
```

### `GET /salud`

No requiere autenticación. Devuelve el estado de la API y el modelo.

**Respuesta ejemplo:**
```json
{
  "estado": "ok",
  "modelo": "cargado",
  "hilos": 1
}
```

## Pruebas (Testing)

### Pruebas unitarias rápidas (no requiere el modelo)

```bash
pytest tests/test_principal.py tests/test_parametros.py -v
```

### Benchmarks de Precisión (requiere el modelo y CrispEmbed funcional)

```bash
pytest tests/test_precision.py -v -s
```

## Linting

```bash
flake8 app/ tests/
```
