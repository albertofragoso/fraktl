IDENTIFY_PROMPT = """Analiza esta imagen de un árbol. Responde SOLO con JSON válido con esta estructura exacta:
{
  "species": "nombre científico de la especie",
  "age_estimate": "estimado en años, ej: '50-80 años'",
  "bark_type": "descripción de la corteza en 5 palabras máximo",
  "branching_pattern": "descripción del patrón de ramificación en 5 palabras máximo",
  "confidence": 0.85
}
Si no puedes identificar la especie, usa "species": "Árbol desconocido"."""
