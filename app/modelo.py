import json
import numpy as np
from pathlib import Path
import os
import sys

# Aseguramos que Python encuentre el wrapper de CrispEmbed
wrapper_path = os.path.join(os.path.dirname(__file__), '..', 'CrispEmbed', 'python')
if wrapper_path not in sys.path:
    sys.path.insert(0, wrapper_path)

from crispembed import CrispEmbed

try:
    from app.temas import DESCRIPCIONES_TEMAS
except (ImportError, ModuleNotFoundError):
    from temas import DESCRIPCIONES_TEMAS

# Archivo GGUF local
MODELO_PATH = os.environ.get(
    "CRISPEMBED_MODEL",
    os.path.join(os.path.dirname(__file__), '..', 'CrispEmbed', 'e5.gguf')
)

INSTRUCCION_CLASIFICACION = (
    "query: "
)


class ClasificadorSoporte:
    """Clasifica tickets de soporte mediante similitud de vectores usando CrispEmbed."""

    def __init__(self):
        self.diccionario_temas = DESCRIPCIONES_TEMAS
        self.temas = list(self.diccionario_temas.keys())
        self.ruta_vectores_prompt = Path(os.path.dirname(__file__)).parent / "vectores_prompt.json"

        if not Path(MODELO_PATH).exists():
            print(f"ADVERTENCIA: No se encontró el modelo en {MODELO_PATH}")

        # Cargar modelo CrispEmbed con 1 hilo (optimizado para PythonAnywhere)
        print(f"Cargando modelo desde: {MODELO_PATH}...")
        try:
            self.modelo = CrispEmbed(MODELO_PATH, n_threads=1)
            print("Modelo cargado exitosamente.")
        except Exception as e:
            print(f"ERROR CRÍTICO: No se pudo inicializar CrispEmbed: {e}")
            self.modelo = None

        if self.modelo:
            self.precomputar()

    def precomputar(self):
        """Pre-calcula los vectores de temas o los carga desde el disco."""
        if self.ruta_vectores_prompt.exists():
            print("Cargando vectores pre-calculados...")
            datos = json.loads(self.ruta_vectores_prompt.read_text())
        else:
            print("Calculando vectores con CrispEmbed...")
            datos = {}
            for tema, descripciones in self.diccionario_temas.items():
                # CrispEmbed devuelve un numpy array directamente
                vectores = self.modelo.encode(descripciones)
                datos[tema] = vectores.tolist()
            self.ruta_vectores_prompt.write_text(json.dumps(datos))

        self._vectores_temas = {
            tema: np.array(vectores, dtype=np.float32) for tema, vectores in datos.items()
        }

    def clasificar(self, texto: str, instruccion: str = None, ejemplos: dict = None) -> dict:
        """Clasifica un ticket comparándolo con los temas pre-calculados."""
        if not self.modelo:
            return {"tema": "Error", "confianza": 0.0, "detalle": "Modelo no inicializado"}

        # 1. Configurar el prefijo (Instrucción) para aprovechamiento de contexto
        # Al usar set_prefix, CrispEmbed puede reutilizar el KV Cache del prefijo
        prefijo = instruccion if instruccion is not None else INSTRUCCION_CLASIFICACION
        self.modelo.set_prefix(prefijo)

        # 2. Generar vector del ticket (el prefijo se maneja internamente en C++)
        vector_ticket = self.modelo.encode(texto)

        # 3. Determinar vectores de referencia
        if ejemplos:
            # Si hay ejemplos personalizados, los codificamos sin prefijo
            self.modelo.set_prefix("")
            vectores_referencia_dict = {
                tema: self.modelo.encode(descripciones)
                for tema, descripciones in ejemplos.items()
            }
            # Restaurar el prefijo original
            self.modelo.set_prefix(prefijo)
        else:
            # Usar los pre-calculados
            vectores_referencia_dict = self._vectores_temas

        # 4. Calcular similitudes
        puntuaciones = {}
        for tema, vectores_referencia in vectores_referencia_dict.items():
            similitudes = vector_ticket @ vectores_referencia.T
            puntuaciones[tema] = float(np.max(similitudes))

        # 5. Determinar el mejor resultado
        mejor_tema = max(puntuaciones, key=puntuaciones.get)
        confianza = puntuaciones[mejor_tema]

        return {
            "tema": mejor_tema,
            "confianza": round(float(confianza), 4)
        }
