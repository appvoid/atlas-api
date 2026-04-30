from flask import Flask, request, jsonify
from functools import wraps
try:
    from app.modelo import ClasificadorSoporte
except (ImportError, ModuleNotFoundError):
    from modelo import ClasificadorSoporte

# --- Seguridad ---
CLAVE_API = "sk-atlas-123"
NOMBRE_CLAVE_API = "apiKey"

# Inicializar Flask y el Modelo
app = Flask(__name__)
clasificador = ClasificadorSoporte()


def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        clave_recibida = request.headers.get(NOMBRE_CLAVE_API)
        if clave_recibida != CLAVE_API:
            return jsonify({"detail": "No se pudieron validar las credenciales"}), 403
        return f(*args, **kwargs)
    return decorated_function


# --- Endpoints ---

@app.route('/clasificar', methods=['POST'])
@require_api_key
def clasificar_ticket():
    datos = request.get_json()

    if not datos or 'texto' not in datos:
        return jsonify({"detail": "El campo 'texto' es obligatorio."}), 422

    texto = datos.get('texto')
    instruccion = datos.get('instruccion')
    ejemplos = datos.get('ejemplos')

    resultado = clasificador.clasificar(
        texto=texto,
        instruccion=instruccion,
        ejemplos=ejemplos
    )

    return jsonify({
        "tema": resultado["tema"],
        "confianza": resultado["confianza"]
    }), 200


@app.route('/salud', methods=['GET'])
def revisar_salud():
    return jsonify({"estado": "ok"}), 200


# Para pruebas locales
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
