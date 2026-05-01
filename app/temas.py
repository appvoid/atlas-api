# Definiciones de temas y sus descripciones representativas.
# Cada descripción actúa como una ancla de referencia en el espacio de vectores.
# El clasificador elige el tema cuyas anclas están más cerca del vector entrante.
#
# Guía de ajuste:
#   - Escribe descripciones como fragmentos de tickets reales, no abstracciones.
#   - Usa vocabulario concreto que contendrían los tickets reales.
#   - Ejecuta `pytest tests/test_precision.py -v -s` después de cada cambio

DESCRIPCIONES_TEMAS: dict[str, list[str]] = {
    "Facturacion": [
        "Pagos y Finanzas: cobros, facturas, reembolsos de dinero, precios y suscripciones.",
        "Problemas con cargos de dinero en la tarjeta, Stripe o transferencia bancaria.",
        "Factura fiscal, recibo de compra sin impuestos, desglose de IVA o proforma.",
        "El recibo que me enviaron no tiene el desglose de impuestos o el IVA.",
        "Cargo doble de dinero, precio que ha subido sin aviso o error en el monto cobrado.",
        "Actualizar datos de facturación de la empresa o información de pago financiera.",
        "El enlace de pago ha expirado, error de validación bancaria o pago fallido.",
        "Reembolso del pedido en mi cuenta bancaria o estado de cuenta financiera.",
        "No reconozco un cobro de dinero en mi extracto bancario o tarjeta de crédito.",
    ],
    "Problema Tecnico": [
        "Fallas del sistema: errores, bugs, crashes, lentitud y mal funcionamiento técnico.",
        "Tengo problemas con mi app, no funciona, se cierra sola o el botón no responde.",
        "Error de sistema, fallo técnico del software o mal funcionamiento de la aplicación.",
        "Error HTTP 500, 502, 504, Gateway Timeout o Database Connection Error.",
        "No recibo las notificaciones de escritorio que tengo configuradas en el sistema.",
        "El uso de memoria se dispara al 100%, carga de CPU alta o sistema congelado.",
        "Imágenes rotas, diseño malformado, enlaces que no cargan o UI defectuosa.",
        "No puedo subir archivos, se corta la conexión o el webhook falla al enviar datos.",
        "El buscador interno no devuelve resultados o el comando de despliegue da error.",
        "Falla el payload del webhook, falta un campo técnico o error de sincronización.",
    ],
    "Acceso a Cuenta": [
        "Perfil de Usuario: login, entrar, contraseñas, perfiles, seguridad y acceso.",
        "No puedo iniciar sesión en mi perfil, usuario bloqueado o cuenta de acceso suspendida.",
        "Recibo avisos de inicio de sesión sospechosos o desde ubicaciones no reconocidas.",
        "No recibo el código SMS de verificación, problemas con MFA, 2FA o FaceID.",
        "Mi aplicación de autenticación está desincronizada o códigos de respaldo perdidos.",
        "Olvidé mi clave de acceso o el cambio de contraseña no cumple los requisitos.",
        "Correo de restablecimiento de perfil no llega o enlace de confirmación utilizado.",
        "Cambiar correo electrónico del perfil, invitar colaboradores o gestionar equipo.",
        "Dispositivo no reconocido para el login o autenticación de seguridad fallida.",
    ],
    "Solicitud de Funcion": [
        "Mejoras y Sugerencias: ideas, peticiones, nuevas características y roadmap.",
        "Me gustaría añadir una función, herramienta o integración (Salesforce, Notion).",
        "Modo oscuro, barra lateral colapsable, widgets nuevos o cambios de diseño.",
        "Modo offline para trabajar sin conexión, exportar datos o guardado automático.",
        "Hoja de ruta para nuevas funciones, API para desarrolladores o aplicación nativa.",
        "Implementar notificaciones push, roles granulares o buscador global avanzado.",
        "Permitir a los usuarios personalizar los widgets de su panel o escritorio.",
    ],
    "Consulta General": [
        "Información y Ayuda: dudas generales, documentación, guías y tutoriales.",
        "¿Dónde puedo encontrar los videos tutoriales para principiantes de su software?",
        "Horarios de atención al cliente, foro de la comunidad, ventas y referidos.",
        "Programas para ONGs, instituciones educativas, becas o descuentos sociales.",
        "Guía de usuario en formato PDF para imprimir o manuales de ayuda descargables.",
        "Diferencia entre planes Pro/Enterprise, demos personalizadas y certificaciones.",
        "Términos y condiciones, T&C, privacidad, legal, cumplimiento SOC2/HIPAA.",
        "Novedades de la última versión, boletín de noticias, anuncios y guías de inicio.",
        "Políticas de retención de datos, ubicación de servidores y visión de la empresa.",
        "Tiempo de respuesta garantizado por el soporte o dudas sobre cómo empezar.",
    ],
}
