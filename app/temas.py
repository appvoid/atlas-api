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
        "Pagos y Dinero / Payments and Money: cobros, facturas, tarjetas, reembolsos, money",
        "Me cobraron dos veces $49.99 en el estado de cuenta de mi tarjeta de crédito Visa",
        "Por favor procesen un reembolso porque mi factura fiscal muestra un monto en "
        "dólares incorrecto",
        "¿Cómo actualizo mis datos de pago en Stripe y la información para transferencias "
        "bancarias?",
        "Mi pago automático falló debido a una tarjeta de débito vencida o fondos insuficientes",
        "Estoy disputando una transacción financiera no autorizada de mi último ciclo "
        "de facturación",
    ],
    "Problema Tecnico": [
        "Errores y Fallos / Technical Issues: bugs, exceptions, crashes, software errors",
        "La aplicación arroja una excepción fatal y se cierra inesperadamente en la pantalla "
        "de carga",
        "El uso de memoria se dispara al 100% y congela el contenedor de la base de datos",
        "El endpoint REST está devolviendo un error HTTP 504 Gateway Timeout",
        "No puedo subir archivos grandes",
        "Las imágenes aparecen como enlaces rotos y los componentes de la interfaz de "
        "usuario (UI) no se visualizan",
        "Encontré un bug en el software que causa un NullReferenceException al guardar "
        "los payloads",
        "Falta el campo customer_id en el payload del webhook desde la última actualización",
    ],
    "Acceso a Cuenta": [
        "Login y Usuarios / Account Access: password, login, locked account, authentication",
        "No puedo autenticarme porque el correo para restablecer la contraseña no llega",
        "Mi perfil se ha bloqueado después de demasiados intentos incorrectos de PIN",
        "No estoy recibiendo el mensaje de texto SMS para la autenticación multifactor (MFA)",
        "Mi sesión expira inmediatamente después de escribir mi nombre de usuario y "
        "presionar Enter",
        "Migración de credenciales de inicio de sesión único (SSO) de Okta a Azure",
    ],
    "Solicitud de Funcion": [
        "Nuevas Funciones / Feature Requests: suggestions, improvements, new tools, changes",
        "Me gustaría pedir una nueva funcionalidad o herramienta para el sistema",
        "¿Pueden crear una nueva funciona o característica para mi blog?",
        "Envío una idea para la hoja de ruta del producto para implementar nuevas características",
        "Me gustaría sugerir el desarrollo de un tema nativo en modo oscuro para la "
        "próxima actualización",
        "Por favor, consideren construir nuevas funciones como un creador de arrastrar y "
        "soltar en la próxima versión",
        "Sería increíblemente útil desarrollar un plugin de integración directa con Salesforce",
        "Mi lista de deseos incluye permitir a los usuarios personalizar los widgets y "
        "diseños del panel de control",
    ],
    "Consulta General": [
        "Dudas y Soporte / General Inquiry: tutorials, documentation, guides, questions",
        "¿Dónde puedo encontrar los videos tutoriales para principiantes y la "
        "documentación oficial?",
        "Necesito ayuda para comenzar con el onboarding inicial y la guía de configuración",
        "¿Cuál es el horario de atención al cliente durante el fin de semana festivo?",
        "¿Ofrecen certificados de cumplimiento como SOC2 o HIPAA para clientes empresariales?",
        "¿Existe un foro de la comunidad donde los usuarios compartan mejores prácticas y "
        "material de aprendizaje?",
        "¿Pueden indicarme dónde encontrar la política de la empresa sobre privacidad y "
        "retención de datos?",
    ],
}
