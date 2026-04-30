# Atlas — API Clasificadora de Tickets de Soporte

Atlas es una API eficiente y segura construida con FastAPI que clasifica textos de tickets de soporte en diferentes temas utilizando el modelo de embeddings [`microsoft/harrier-oss-v1-270m`](https://huggingface.co/microsoft/harrier-oss-v1-270m).

## Cómo Funciona

Harrier es un **modelo de embeddings de texto**, no un generador de texto. Atlas lo utiliza para **clasificación zero-shot mediante similitud de embeddings**:

1. **Al iniciar**, el modelo precalcula los embeddings de referencia para un conjunto de descripciones representativas por tema (ej. *"Problema con el pago de factura"* → Billing).
2. **En cada solicitud**, el texto del ticket entrante se codifica en un embedding usando un prompt de instrucción (`Instruct: Retrieve the support ticket category that best matches this message\nQuery: <text>`).
3. Se calcula la **similitud del coseno** entre el embedding del ticket y cada embedding de referencia. El tema con la mayor similitud gana.

Este enfoque es rápido (un solo pase hacia adelante por solicitud), preciso y no requiere de un entrenamiento adicional (fine-tuning).

### Temas Soportados

| Tema (Topic) | Descripción |
|---|---|
| Facturacion | Cargos, reembolsos, facturas, métodos de pago |
| Problema Tecnico | Bugs, fallos, errores, caídas del sistema, fallos de API |
| Acceso a Cuenta | Problemas de inicio de sesión, restablecimiento de contraseñas, bloqueos, permisos |
| Solicitud de Funcion | Sugerencias, nuevas funcionalidades, mejoras |
| Consulta General | Documentación, guías iniciales (onboarding), estados del servicio |

## Configuración

```bash
pip install -r requirements.txt
```

## Ejecutar la API

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

En la primera ejecución, los pesos del modelo (~540 MB) se descargarán automáticamente desde Hugging Face.

## Uso

### `POST /clasificar`

Requiere el encabezado `apiKey`. Clave predeterminada: `sk-atlas-123`.

#### Parámetros de la Petición

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `texto` | `string` | Sí | El texto del ticket de soporte a clasificar. |
| `instruccion` | `string` | No | Una instrucción personalizada que reemplaza el prefijo predeterminado del modelo. |
| `ejemplos` | `dict` | No | Un diccionario de temas y sus ejemplos (`{"Tema": ["ejemplo1", "ejemplo2"]}`) que reemplaza los temas por defecto. |

> [!IMPORTANT]
> Si se proporcionan `ejemplos` personalizados, la clasificación se realizará **únicamente** contra esos ejemplos, ignorando los temas predeterminados. Esto incurrirá en un pequeño retraso debido a la codificación de los nuevos ejemplos.

#### Ejemplo Básico

```bash
curl -X POST "http://localhost:8000/clasificar" \
     -H "apiKey: sk-atlas-123" \
     -H "Content-Type: application/json" \
     -d '{"texto": "Mi servidor se bloquea al subir archivos grandes."}'
```

#### Ejemplo con Parámetros Personalizados

```bash
curl -X POST "http://localhost:8000/clasificar" \
     -H "apiKey: sk-atlas-123" \
     -H "Content-Type: application/json" \
     -d '{
       "texto": "necesito ayuda",
       "instruccion": "Retrieve the urgency level for this message: ",
       "ejemplos": {
         "Urgente": ["fuego", "emergencia", "caída total"],
         "Normal": ["pregunta", "duda", "ayuda"]
       }
     }'
```

**Respuesta:**

```json
{
  "tema": "Normal",
  "confianza": 0.8234
}
```

### `GET /salud`

No requiere autenticación.

```bash
curl http://localhost:8000/salud
```

## Seguridad

- Todos los endpoints de clasificación requieren una clave de API mediante el encabezado `apiKey`.
- Las solicitudes sin una clave válida reciben una respuesta `403 Forbidden`.
- La entrada de datos se valida a través de los esquemas de Pydantic; las solicitudes mal formadas devuelven `422 Unprocessable Entity`.

## Pruebas (Testing)

### Pruebas unitarias rápidas (no requiere el modelo)

```bash
pytest tests/test_principal.py tests/test_parametros.py -v
```

Estas pruebas simulan (mock) el clasificador y se ejecutan en segundos, siendo seguras para Entornos de Integración Continua (CI).

### Benchmarks de Precisión (requiere el modelo)

```bash
pytest tests/test_precision.py -v -s
```

Carga el modelo Harrier real y clasifica muestras de tickets conocidos comparándolos contra los temas esperados. Imprime un informe de precisión por tema y falla si la precisión general cae por debajo del 80%.

Utiliza esto después de editar `app/temas.py` para medir el impacto de tus cambios en la calidad de la clasificación.

### Omitir pruebas de precisión en CI

```bash
pytest -m "not accuracy"
```

## Linting

```bash
flake8 app/ tests/
```
