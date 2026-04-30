import json
import numpy as np
from sentence_transformers import SentenceTransformer
from pathlib import Path
from app.temas import DESCRIPCIONES_TEMAS

NOMBRE_MODELO = "microsoft/harrier-oss-v1-270m"

INSTRUCCION_CLASIFICACION = (
    "Instruct: Retrieve the support ticket category that best matches this message\nQuery: "
)


class ClasificadorSoporte:
    """Clasifica tickets de soporte mediante similitud de vectores."""

    def __init__(self):
        self.diccionario_temas = DESCRIPCIONES_TEMAS
        self.temas = list(self.diccionario_temas.keys())
        self.ruta_vectores_prompt = Path("vectores_prompt.json")

        self.modelo = SentenceTransformer(
            NOMBRE_MODELO, model_kwargs={"dtype": "auto"}
        )
        self.precomputar()

    def precomputar(self):
        """Pre-calcula los vectores de temas o los carga desde el disco."""

        if self.ruta_vectores_prompt.exists():
            # 1. Cargar datos JSON
            print("Cargando vectores pre-calculados...")
            datos = json.loads(self.ruta_vectores_prompt.read_text())
        else:
            # 2. Calcular si faltan
            print("Calculando vectores...")
            datos = {}
            for tema, descripciones in self.diccionario_temas.items():
                vectores = self.modelo.encode(descripciones)
                datos[tema] = vectores.tolist()

            # 3. Guardar para la próxima
            self.ruta_vectores_prompt.write_text(json.dumps(datos))

        # 4. Convertir las listas en arreglos numpy
        self._vectores_temas = {
            tema: np.array(vectores) for tema, vectores in datos.items()
        }

    def clasificar(
        self, texto: str, instruccion: str = None, ejemplos: dict[str, list[str]] = None
    ) -> dict:
        """Devuelve el mejor tema coincidente y su nivel de confianza."""

        # 1. Determinar instrucción
        prefijo = instruccion if instruccion is not None else INSTRUCCION_CLASIFICACION

        # 2. Generar vector del ticket
        vector_ticket = self.modelo.encode([prefijo + texto])

        # 3. Determinar qué vectores de referencia usar
        if ejemplos is not None:
            # Codificar ejemplos personalizados al vuelo
            vectores_referencia_dict = {}
            for tema, descripciones in ejemplos.items():
                vectores = self.modelo.encode(descripciones)
                vectores_referencia_dict[tema] = np.array(vectores)
        else:
            # Usar vectores precomputados
            vectores_referencia_dict = self._vectores_temas

        # 4. Calcular similitudes
        puntuaciones: dict[str, float] = {}
        for tema, vectores_referencia in vectores_referencia_dict.items():
            # Similitud del coseno
            similitudes = (vector_ticket @ vectores_referencia.T)[0]
            puntuaciones[tema] = float(np.max(similitudes))

        # 5. Determinar el mejor tema
        mejor_tema = max(puntuaciones, key=puntuaciones.get)
        mejor_puntuacion = puntuaciones[mejor_tema]

        confianza = round(min(max(mejor_puntuacion, 0.0), 1.0), 4)

        return {"tema": mejor_tema, "confianza": confianza}
