"""Benchmarks de precisión para el clasificador basado en vectores en español.

Ejecutar con:
    pytest tests/test_precision.py -v -s

Omitir en CI:
    pytest -m "not accuracy"
"""
import pytest

from app.modelo import ClasificadorSoporte

# ── Muestras conocidas: (texto_ticket, tema_esperado) ─────────────────────

MUESTRAS = [
    # Facturacion
    ("Hay un cargo doble de $49.99 en el estado de cuenta de mi tarjeta Visa", "Facturacion"),
    ("Por favor, generen una factura fiscal para el pago del mes pasado", "Facturacion"),
    ("Mi pago automático falló debido a una tarjeta de débito caducada", "Facturacion"),
    ("¿Cuándo se reflejará el reembolso del pedido #78291 en mi cuenta bancaria?", "Facturacion"),
    ("¿Puedo pagar mi renovación anual mediante transferencia bancaria en lugar de Stripe?", "Facturacion"),  # noqa: E501

    # Problema Tecnico
    ("El script de exportación de datos arroja un NullReferenceException en la línea 42", "Problema Tecnico"),  # noqa: E501
    ("Las imágenes en el componente de la galería se muestran como enlaces rotos en Chrome", "Problema Tecnico"),  # noqa: E501
    ("El uso de memoria se dispara al 100% y congela el contenedor de la aplicación", "Problema Tecnico"),  # noqa: E501
    ("Al payload del webhook le falta el campo customer_id desde la última actualización", "Problema Tecnico"),  # noqa: E501
    ("El envío del formulario de contacto devuelve un HTTP 504 Gateway Timeout", "Problema Tecnico"),  # noqa: E501

    # Acceso a Cuenta
    ("Olvidé mi contraseña y el correo electrónico para restablecerla nunca llegó", "Acceso a Cuenta"),  # noqa: E501
    ("Mi aplicación de autenticación está desincronizada y perdí mis códigos de respaldo", "Acceso a Cuenta"),  # noqa: E501
    ("El sistema bloqueó mi perfil después de demasiados intentos incorrectos de PIN", "Acceso a Cuenta"),  # noqa: E501
    ("Necesito migrar mi inicio de sesión único (SSO) de Okta a Azure AD", "Acceso a Cuenta"),
    ("Mi sesión de inicio expira inmediatamente después de escribir mi nombre de usuario", "Acceso a Cuenta"),  # noqa: E501

    # Solicitud de Funcion
    ("Me gustaría sugerir agregar un tema de modo oscuro a la interfaz de usuario", "Solicitud de Funcion"),  # noqa: E501
    ("¿Hay una hoja de ruta para implementar el desbloqueo biométrico nativo FaceID?", "Solicitud de Funcion"),  # noqa: E501
    ("Sería increíblemente útil crear una integración directa con Salesforce", "Solicitud de Funcion"),  # noqa: E501
    ("Por favor, consideren construir un creador de flujos de trabajo de arrastrar y soltar en la próxima versión", "Solicitud de Funcion"),  # noqa: E501
    ("Envío una idea: permitir a los usuarios personalizar los widgets de su panel", "Solicitud de Funcion"),  # noqa: E501

    # Consulta General
    ("¿Dónde puedo encontrar los videos tutoriales para principiantes para su software?", "Consulta General"),  # noqa: E501
    ("¿Cuál es el horario de atención al cliente durante el fin de semana festivo?", "Consulta General"),  # noqa: E501
    ("¿Ofrecen certificados de cumplimiento como SOC2 o HIPAA para clientes empresariales?", "Consulta General"),  # noqa: E501
    ("¿Hay un foro de la comunidad donde los usuarios compartan sus mejores prácticas?", "Consulta General"),  # noqa: E501
    ("¿Pueden indicarme la documentación sobre sus políticas de retención de datos?", "Consulta General"),  # noqa: E501
]


@pytest.fixture(scope="module")
def clasificador():
    """Carga el modelo real una vez para todo el módulo de prueba."""
    return ClasificadorSoporte()


@pytest.mark.accuracy
@pytest.mark.parametrize("texto,esperado", MUESTRAS)
def test_clasificar_muestra(clasificador, texto, esperado):
    resultado = clasificador.clasificar(texto)
    assert resultado["tema"] == esperado, (
        f"Esperaba '{esperado}', obtuvo '{resultado['tema']}' "
        f"(confianza={resultado['confianza']:.4f})"
    )


@pytest.mark.accuracy
def test_precision_general(clasificador):
    """Imprime un reporte de precisión por tema. Falla si es menor a 80%."""
    correctos_por_tema: dict[str, int] = {}
    total_por_tema: dict[str, int] = {}

    for texto, esperado in MUESTRAS:
        resultado = clasificador.clasificar(texto)
        total_por_tema[esperado] = total_por_tema.get(esperado, 0) + 1
        if resultado["tema"] == esperado:
            correctos_por_tema[esperado] = (
                correctos_por_tema.get(esperado, 0) + 1
            )

    print("\n" + "=" * 60)
    print("REPORTE DE PRECISIÓN (ESPAÑOL)")
    print("=" * 60)

    total_correctos = 0
    total_muestras = 0
    for tema in sorted(total_por_tema.keys()):
        correctos = correctos_por_tema.get(tema, 0)
        total = total_por_tema[tema]
        acc = correctos / total * 100
        total_correctos += correctos
        total_muestras += total
        print(f"  {tema:<20s}  {correctos}/{total}  ({acc:5.1f}%)")

    general = total_correctos / total_muestras * 100
    print("-" * 60)
    print(f"  {'GENERAL':<20s}  {total_correctos}/{total_muestras}  ({general:5.1f}%)")
    print("=" * 60)

    assert general >= 80.0, (
        f"Precisión general {general:.1f}% está por debajo del umbral del 80%. "
        "Ajusta las descripciones en app/temas.py."
    )
