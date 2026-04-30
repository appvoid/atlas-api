from typing import Optional, Dict, List
from fastapi import FastAPI, Depends, Security, HTTPException, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from app.modelo import ClasificadorSoporte


# --- Seguridad ---
CLAVE_API = "sk-atlas-123"
NOMBRE_CLAVE_API = "apiKey"
encabezado_clave_api = APIKeyHeader(name=NOMBRE_CLAVE_API, auto_error=False)


def obtener_clave_api(encabezado_clave_api: str = Security(encabezado_clave_api)) -> str:
    if encabezado_clave_api == CLAVE_API:
        return encabezado_clave_api
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No se pudieron validar las credenciales"
    )


# --- Esquemas ---
class PeticionClasificacion(BaseModel):
    texto: str = Field(..., description="El texto del ticket de soporte a clasificar.")
    instruccion: Optional[str] = Field(
        None, description="Instrucción personalizada para el modelo."
    )
    ejemplos: Optional[Dict[str, List[str]]] = Field(
        None, description="Ejemplos personalizados para clasificar."
    )


class RespuestaClasificacion(BaseModel):
    tema: str = Field(..., description="El tema predecido del ticket.")
    confianza: float = Field(..., description="La puntuación de confianza de la predicción.")


# --- App & Modelo ML ---
app = FastAPI(
    title="API Clasificadora de Soporte Atlas",
    description="Una API eficiente y segura para clasificar textos de tickets de soporte.",
    version="1.0.0"
)


# Inicializar pipeline
clasificador = ClasificadorSoporte()


@app.post(
    "/clasificar",
    response_model=RespuestaClasificacion,
    dependencies=[Depends(obtener_clave_api)]
)
async def clasificar_ticket(peticion: PeticionClasificacion):
    resultado = clasificador.clasificar(
        peticion.texto,
        instruccion=peticion.instruccion,
        ejemplos=peticion.ejemplos
    )
    return RespuestaClasificacion(
        tema=resultado["tema"],
        confianza=resultado["confianza"]
    )


@app.get("/salud")
async def revisar_salud():
    return {"estado": "ok"}
