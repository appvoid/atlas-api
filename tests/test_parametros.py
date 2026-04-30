from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app


client = TestClient(app)

CLAVE_API = "sk-atlas-123"
ENCABEZADOS = {"apiKey": CLAVE_API}


@patch("app.main.clasificador")
def test_clasificar_con_instruccion_personalizada(mock_clasificador):
    mock_clasificador.clasificar.return_value = {"tema": "Facturacion", "confianza": 0.95}

    payload = {
        "texto": "Hola, tengo un problema con mi pago",
        "instruccion": "Custom instruction: "
    }

    respuesta = client.post("/clasificar", headers=ENCABEZADOS, json=payload)

    assert respuesta.status_code == 200
    mock_clasificador.clasificar.assert_called_once_with(
        "Hola, tengo un problema con mi pago",
        instruccion="Custom instruction: ",
        ejemplos=None
    )


@patch("app.main.clasificador")
def test_clasificar_con_ejemplos_personalizados(mock_clasificador):
    mock_clasificador.clasificar.return_value = {"tema": "Soporte", "confianza": 0.88}

    ejemplos = {
        "Soporte": ["ayuda tecnica", "no funciona"],
        "Ventas": ["precio", "comprar"]
    }

    payload = {
        "texto": "necesito ayuda",
        "ejemplos": ejemplos
    }

    respuesta = client.post("/clasificar", headers=ENCABEZADOS, json=payload)

    assert respuesta.status_code == 200
    mock_clasificador.clasificar.assert_called_once_with(
        "necesito ayuda",
        instruccion=None,
        ejemplos=ejemplos
    )


@patch("app.main.clasificador")
def test_clasificar_con_ambos_parametros(mock_clasificador):
    mock_clasificador.clasificar.return_value = {"tema": "Urgente", "confianza": 0.99}

    ejemplos = {"Urgente": ["fuego", "auxilio"]}
    instruccion = "Prioridad maxima: "

    payload = {
        "texto": "hay un incendio",
        "instruccion": instruccion,
        "ejemplos": ejemplos
    }

    respuesta = client.post("/clasificar", headers=ENCABEZADOS, json=payload)

    assert respuesta.status_code == 200
    mock_clasificador.clasificar.assert_called_once_with(
        "hay un incendio",
        instruccion=instruccion,
        ejemplos=ejemplos
    )
