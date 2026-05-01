"""Benchmarks de precisión para el clasificador basado en vectores en español.

Ejecutar con:
    pytest tests/test_precision.py -v -s
"""
import pytest
from app.modelo import ClasificadorSoporte

# ── Muestras (100 ejemplos - Incluyendo casos ambiguos) ─────────────────────

MUESTRAS = [
    # Facturacion (20)
    ("Hay un cargo doble de $49.99 en el estado de cuenta de mi tarjeta Visa", "Facturacion"),
    ("Por favor, generen una factura fiscal para el pago del mes pasado", "Facturacion"),
    ("Mi pago automático falló debido a una tarjeta de débito caducada", "Facturacion"),
    ("¿Cuándo se reflejará el reembolso del pedido #78291 en mi cuenta bancaria?", "Facturacion"),
    ("¿Puedo pagar mi renovación anual mediante transferencia bancaria en lugar de Stripe?", "Facturacion"),
    ("¿Cómo puedo cambiar los datos de facturación de mi empresa?", "Facturacion"),
    ("No reconozco este cobro de $15 en mi cuenta", "Facturacion"),
    ("Quiero cancelar mi suscripción premium y pedir la devolución del dinero", "Facturacion"),
    ("¿Dónde descargo el historial de mis pagos mensuales?", "Facturacion"),
    ("¿Tienen algún descuento por pago anual por adelantado?", "Facturacion"),
    ("Me han cobrado el IVA por error en mi última suscripción", "Facturacion"),
    ("Necesito actualizar el número de mi tarjeta de crédito para el próximo cobro", "Facturacion"),
    ("El recibo que me enviaron no tiene el desglose de impuestos", "Facturacion"),
    ("¿Por qué el precio ha subido sin previo aviso en mi factura?", "Facturacion"),
    ("No puedo añadir un nuevo método de pago, me da error de validación bancaria", "Facturacion"),
    ("He pagado por transferencia pero mi cuenta sigue apareciendo como básica", "Facturacion"),
    ("¿Cómo solicito una factura proforma para mi departamento de finanzas?", "Facturacion"),
    ("El link de pago que me enviaron por correo ha expirado", "Facturacion"),
    ("¿Cuál es el límite de gasto para las facturaciones automáticas?", "Facturacion"),
    ("Quiero cambiar de facturación mensual a anual", "Facturacion"),

    # Problema Tecnico (20)
    ("El script de exportación de datos arroja un NullReferenceException en la línea 42", "Problema Tecnico"),
    ("Las imágenes en el componente de la galería se muestran como enlaces rotos en Chrome", "Problema Tecnico"),
    ("El uso de memoria se dispara al 100% y congela el contenedor de la aplicación", "Problema Tecnico"),
    ("Al payload del webhook le falta el campo customer_id desde la última actualización", "Problema Tecnico"),
    ("El envío del formulario de contacto devuelve un HTTP 504 Gateway Timeout", "Problema Tecnico"),
    ("La API está caída y devuelve un error 502 Bad Gateway", "Problema Tecnico"),
    ("No puedo subir archivos de más de 5MB, se corta la conexión", "Problema Tecnico"),
    ("El sistema se queda colgado al intentar procesar lotes grandes de datos", "Problema Tecnico"),
    ("Hay un error de sintaxis en el archivo de configuración generado", "Problema Tecnico"),
    ("La aplicación se cierra sola al abrir el menú de ajustes en Android", "Problema Tecnico"),
    ("El botón de guardado no responde cuando hago clic en él", "Problema Tecnico"),
    ("Los datos no se sincronizan correctamente entre la web y la app móvil", "Problema Tecnico"),
    ("Recibo un mensaje de 'Database Connection Error' al intentar entrar", "Problema Tecnico"),
    ("La página tarda más de 30 segundos en cargar, va muy lenta", "Problema Tecnico"),
    ("Se ha roto el diseño de la tabla en resoluciones de pantalla pequeñas", "Problema Tecnico"),
    ("El buscador interno no devuelve ningún resultado aunque las palabras existan", "Problema Tecnico"),
    ("No recibo las notificaciones de escritorio que tengo configuradas", "Problema Tecnico"),
    ("El comando de despliegue falla con un error de permisos en el servidor", "Problema Tecnico"),
    ("Las gráficas del dashboard no muestran datos, aparecen vacías", "Problema Tecnico"),
    ("La integración con la API externa está devolviendo respuestas malformadas", "Problema Tecnico"),

    # Acceso a Cuenta (20)
    ("Olvidé mi contraseña y el correo electrónico para restablecerla nunca llegó", "Acceso a Cuenta"),
    ("Mi aplicación de autenticación está desincronizada y perdí mis códigos de respaldo", "Acceso a Cuenta"),
    ("El sistema bloqueó mi perfil después de demasiados intentos incorrectos de PIN", "Acceso a Cuenta"),
    ("Necesito migrar mi inicio de sesión único (SSO) de Okta a Azure AD", "Acceso a Cuenta"),
    ("Mi sesión de inicio expira inmediatamente después de escribir mi nombre de usuario", "Acceso a Cuenta"),
    ("No recibo el código SMS para la verificación en dos pasos", "Acceso a Cuenta"),
    ("Quiero cambiar el correo electrónico principal asociado a mi perfil", "Acceso a Cuenta"),
    ("Mi cuenta ha sido suspendida y no sé por qué", "Acceso a Cuenta"),
    ("¿Cómo puedo activar la autenticación biométrica en la app móvil?", "Acceso a Cuenta"),
    ("He perdido acceso a mi cuenta de administrador", "Acceso a Cuenta"),
    ("El enlace para confirmar mi cuenta me dice que ya ha sido utilizado", "Acceso a Cuenta"),
    ("No puedo desvincular mi cuenta de Google de mi perfil de usuario", "Acceso a Cuenta"),
    ("¿Cómo puedo eliminar mi cuenta y todos mis datos de forma permanente?", "Acceso a Cuenta"),
    ("Mi nombre de usuario aparece como incorrecto pero estoy seguro de que es ese", "Acceso a Cuenta"),
    ("He intentado cambiar la contraseña pero me dice que no cumple los requisitos", "Acceso a Cuenta"),
    ("¿Cómo gestiono los permisos de los otros miembros de mi equipo?", "Acceso a Cuenta"),
    ("Recibo avisos de inicio de sesión desde ubicaciones que no reconozco", "Acceso a Cuenta"),
    ("No me deja entrar desde mi nueva tablet, dice dispositivo no reconocido", "Acceso a Cuenta"),
    ("¿Puedo invitar a nuevos colaboradores a mi espacio de trabajo?", "Acceso a Cuenta"),
    ("Mi perfil de usuario no carga, se queda la pantalla en blanco al entrar", "Acceso a Cuenta"),

    # Solicitud de Funcion (20)
    ("Me gustaría sugerir agregar un tema de modo oscuro a la interfaz de usuario", "Solicitud de Funcion"),
    ("¿Hay una hoja de ruta para implementar el desbloqueo biométrico nativo FaceID?", "Solicitud de Funcion"),
    ("Sería increíblemente útil crear una integración directa con Salesforce", "Solicitud de Funcion"),
    ("Por favor, consideren construir un creador de flujos de trabajo de arrastrar y soltar en la próxima versión", "Solicitud de Funcion"),
    ("Envío una idea: permitir a los usuarios personalizar los widgets de su panel", "Solicitud de Funcion"),
    ("¿Podrían añadir soporte para exportar informes en formato Excel?", "Solicitud de Funcion"),
    ("Sería genial tener una aplicación nativa para macOS", "Solicitud de Funcion"),
    ("Sugerencia: añadir un sistema de etiquetas para organizar los proyectos", "Solicitud de Funcion"),
    ("Me gustaría pedir que añadan más idiomas a la interfaz", "Solicitud de Funcion"),
    ("¿Es posible implementar notificaciones push para los cambios de estado?", "Solicitud de Funcion"),
    ("Petición: que el sistema guarde automáticamente los borradores", "Solicitud de Funcion"),
    ("Sería muy útil tener un modo offline para trabajar sin conexión", "Solicitud de Funcion"),
    ("¿Tienen planeado añadir una API para desarrolladores externos?", "Solicitud de Funcion"),
    ("Me gustaría que se pudieran importar datos directamente desde Notion", "Solicitud de Funcion"),
    ("¿Podrían añadir más gráficos de barras al módulo de estadísticas?", "Solicitud de Funcion"),
    ("Sugerencia de diseño: que la barra lateral sea colapsable", "Solicitud de Funcion"),
    ("Me encantaría tener un buscador global que encuentre también dentro de archivos", "Solicitud de Funcion"),
    ("¿Se podría implementar un sistema de roles más granular?", "Solicitud de Funcion"),
    ("Me gustaría proponer una mejora en la velocidad de las exportaciones", "Solicitud de Funcion"),
    ("¿Van a añadir plantillas predefinidas para los nuevos proyectos?", "Solicitud de Funcion"),

    # Consulta General (20)
    ("¿Dónde puedo encontrar los videos tutoriales para principiantes para su software?", "Consulta General"),
    ("¿Cuál es el horario de atención al cliente durante el fin de semana festivo?", "Consulta General"),
    ("¿Ofrecen certificados de cumplimiento como SOC2 o HIPAA para clientes empresariales?", "Consulta General"),
    ("¿Hay un foro de la comunidad donde los usuarios compartan sus mejores prácticas?", "Consulta General"),
    ("¿Pueden indicarme la documentación sobre sus políticas de retención de datos?", "Consulta General"),
    ("¿Cómo puedo contactar con el equipo de ventas?", "Consulta General"),
    ("¿Tienen alguna guía de implementación para principiantes?", "Consulta General"),
    ("¿Dónde puedo leer los términos y condiciones del servicio?", "Consulta General"),
    ("¿Cuál es la diferencia entre el plan Pro y el Enterprise?", "Consulta General"),
    ("¿Me pueden dar más información sobre su política de privacidad?", "Consulta General"),
    ("¿Dónde están ubicados sus servidores de datos?", "Consulta General"),
    ("¿Cómo funciona el programa de referidos para usuarios antiguos?", "Consulta General"),
    ("Necesito la guía de usuario completa en formato PDF para imprimir", "Consulta General"),
    ("¿Cuál es la visión a largo plazo de la empresa?", "Consulta General"),
    ("¿Tienen estudios de caso de otras empresas en mi sector?", "Consulta General"),
    ("¿Cómo puedo solicitar una demo personalizada para mi equipo?", "Consulta General"),
    ("¿Tienen algún programa para ONGs o instituciones educativas?", "Consulta General"),
    ("¿Cuál es el tiempo de respuesta garantizado por el equipo de soporte?", "Consulta General"),
    ("¿Dónde puedo ver las novedades de la última versión lanzada?", "Consulta General"),
    ("¿Cómo me suscribo al boletín de noticias de la plataforma?", "Consulta General"),
]

@pytest.fixture(scope="module")
def clasificador():
    return ClasificadorSoporte()

@pytest.mark.accuracy
@pytest.mark.parametrize("texto,esperado", MUESTRAS)
def test_clasificar_muestra(clasificador, texto, esperado):
    resultado = clasificador.clasificar(texto)
    assert resultado["tema"] == esperado, (
        f"Esperaba '{esperado}', obtuvo '{resultado['tema']}' "
        f"(confianza={resultado['confianza']:.4f})"
    )

def test_precision_general(clasificador):
    conteo = {tema: {"total": 0, "correctos": 0} for tema in set(e for _, e in MUESTRAS)}
    for texto, esperado in MUESTRAS:
        resultado = clasificador.clasificar(texto)
        conteo[esperado]["total"] += 1
        if resultado["tema"] == esperado:
            conteo[esperado]["correctos"] += 1

    print("\n" + "="*60)
    print("REPORTE DE PRECISIÓN (ESPAÑOL - 100 EJEMPLOS)")
    print("="*60)
    total_correctos = 0
    for tema, stat in sorted(conteo.items()):
        acc = (stat["correctos"] / stat["total"]) * 100
        total_correctos += stat["correctos"]
        print(f"  {tema:<20} {stat['correctos']}/{stat['total']}  ({acc:>5.1f}%)")
    
    print("-" * 60)
    acc_total = (total_correctos / len(MUESTRAS)) * 100
    print(f"  GENERAL               {total_correctos}/{len(MUESTRAS)}  ({acc_total:>5.1f}%)")
    print("=" * 60)
