from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app

client = TestClient(app)

CLAVE_API = "sk-atlas-123"
ENCABEZADOS = {"apiKey": CLAVE_API}


def test_revisar_salud():
    respuesta = client.get("/salud")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok"}


def test_clasificar_sin_autorizacion():
    respuesta = client.post("/clasificar", json={"texto": "I can't login"})
    assert respuesta.status_code == 403


def test_clasificar_clave_incorrecta():
    respuesta = client.post(
        "/clasificar",
        headers={"X-API-Key": "clave-falsa"},
        json={"texto": "I can't login"},
    )
    assert respuesta.status_code == 403


def test_clasificar_texto_vacio():
    """Pydantic debería rechazar una petición con campo de texto faltante."""
    respuesta = client.post("/clasificar", headers=ENCABEZADOS, json={})
    assert respuesta.status_code == 422


@patch("app.main.clasificador")
def test_clasificar_ticket(mock_clasificador):
    mock_clasificador.clasificar.return_value = {"tema": "Facturacion", "confianza": 0.87}

    respuesta = client.post(
        "/clasificar",
        headers=ENCABEZADOS,
        json={"texto": "I was charged twice for my subscription"},
    )
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["tema"] == "Facturacion"
    assert 0.0 <= datos["confianza"] <= 1.0


@patch("app.main.clasificador")
def test_clasificar_esquema_respuesta(mock_clasificador):
    """Verifica que la respuesta siempre contenga tema y confianza."""
    mock_clasificador.clasificar.return_value = {"tema": "Consulta General", "confianza": 0.72}

    respuesta = client.post(
        "/clasificar",
        headers=ENCABEZADOS,
        json={"texto": "How do I get started with your product?"},
    )
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert "tema" in datos
    assert "confianza" in datos
    assert isinstance(datos["tema"], str)
    assert isinstance(datos["confianza"], float)
