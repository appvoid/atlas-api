# Atlas — API Clasificadora de Tickets de Soporte

> [!NOTE]
> **Migración de Arquitectura:** Atlas ha sido migrado de FastAPI + PyTorch a **Flask + CrispEmbed**. Este cambio se realizó para facilitar el despliegue en entornos de producción (como PythonAnywhere), eliminando dependencias pesadas y reduciendo el consumo de recursos sin perder precisión.

Atlas es una API ultra-ligera y eficiente construida con **Flask** y **CrispEmbed** que clasifica textos de tickets de soporte en diferentes temas. Utiliza un binario de C++ (CrispEmbed) para manejar modelos de embeddings en formato GGUF, lo que reduce drásticamente el consumo de memoria y elimina la dependencia de PyTorch (~2GB).

## Cómo Funciona

Atlas utiliza **clasificación zero-shot mediante similitud de embeddings** aprovechando el modelo `harrier-270m-q8_0.gguf`:

1. **Al iniciar**, el modelo carga los pesos desde un archivo `.gguf` local y precalcula los embeddings de referencia para un conjunto de descripciones representativas por tema.
2. **En cada solicitud**, el texto del ticket entrante se codifica en un embedding usando un prompt de instrucción (`Instruct: Retrieve the support ticket category that best matches this message\nQuery: <text>`).
3. Se calcula la **similitud del coseno** (producto punto sobre vectores normalizados) entre el embedding del ticket y cada embedding de referencia. El tema con la mayor similitud gana.

Este enfoque es extremadamente rápido y consume muy poca RAM, siendo ideal para despliegues en entornos limitados como **PythonAnywhere**.

### Temas Soportados

| Tema (Topic) | Descripción |
|---|---|
| Facturacion | Cargos, reembolsos, facturas, métodos de pago |
| Problema Tecnico | Bugs, fallos, errores, caídas del sistema, fallos de API |
| Acceso a Cuenta | Problemas de inicio de sesión, restablecimiento de contraseñas, bloqueos, permisos |
| Solicitud de Funcion | Sugerencias, nuevas funcionalidades, mejoras |
| Consulta General | Documentación, guías iniciales (onboarding), estados del servicio |

## Configuración

1. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

2. Asegúrate de tener el archivo del modelo GGUF en la carpeta `crispembed/` (ej. `weights_q8_0.gguf`).

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

No requiere autenticación. Devuelve el estado de la API.

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
