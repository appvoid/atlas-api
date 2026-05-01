import json
import numpy as np
from pathlib import Path
import os
import sys

# Aseguramos que Python encuentre el wrapper de CrispEmbed
wrapper_path = os.path.join(os.path.dirname(__file__), '..', 'crispembed', 'python')
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
    os.path.join(os.path.dirname(__file__), '..', 'crispembed', 'es_q8_0.gguf')
)

# Prefijos obligatorios para modelos E5
PREFIX_QUERY = "query: "
PREFIX_PASSAGE = "passage: "


class ClasificadorSoporte:
    """Clasifica tickets de soporte mediante similitud de vectores usando CrispEmbed."""

    def __init__(self):
        self.diccionario_temas = DESCRIPCIONES_TEMAS
        self.temas = list(self.diccionario_temas.keys())
        self.ruta_vectores_prompt = Path(os.path.dirname(__file__)).parent / "vectores_prompt.json"

        if not Path(MODELO_PATH).exists():
            print(f"ADVERTENCIA: No se encontró el modelo en {MODELO_PATH}")

        # Cargar modelo CrispEmbed
        self.modelo = CrispEmbed(MODELO_PATH, n_threads=4)
        self.precomputar()

    def precomputar(self):
        """Pre-calcula los vectores de las descripciones de los temas."""
        if self.ruta_vectores_prompt.exists() and not os.environ.get("REFRESH_VECTORS"):
            print("Cargando vectores pre-calculados...")
            with open(self.ruta_vectores_prompt, 'r') as f:
                datos = json.load(f)
            self._vectores_temas = {tema: np.array(v) for tema, v in datos.items()}
        else:
            print("Calculando vectores con CrispEmbed (modo passage)...")
            # Para modelos E5, las referencias deben llevar el prefijo 'passage: '
            self.modelo.set_prefix(PREFIX_PASSAGE)
            datos = {}
            for tema, descripciones in self.diccionario_temas.items():
                vectores = self.modelo.encode(descripciones)
                datos[tema] = vectores.tolist()

            with open(self.ruta_vectores_prompt, 'w') as f:
                json.dump(datos, f)
            self._vectores_temas = {tema: np.array(v) for tema, v in datos.items()}

    def clasificar(self, texto: str, instruccion: str = None, ejemplos: dict = None) -> dict:
        """Clasifica un ticket usando el modo query de E5."""
        # Para modelos E5, la consulta debe llevar el prefijo 'query: '
        prefijo = instruccion if instruccion is not None else "query: "
        self.modelo.set_prefix(prefijo)

        vector_ticket = self.modelo.encode(texto)

        # Determinar vectores de referencia
        if ejemplos:
            # Si hay ejemplos dinámicos, los tratamos como 'passage'
            self.modelo.set_prefix("passage: ")
            vectores_referencia_dict = {
                tema: self.modelo.encode(desc) if isinstance(desc, list) else self.modelo.encode([desc])
                for tema, desc in ejemplos.items()
            }
            self.modelo.set_prefix(prefijo) # Restaurar query
        else:
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
