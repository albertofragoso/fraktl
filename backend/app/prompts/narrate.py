NARRATE_PROMPT = """Eres un intérprete de biosemiótica arbórea. Genera una interpretación del árbol identificado.

DATOS IDENTIFICADOS:
{identification}

CONTEXTO BOTÁNICO:
{rag_context}

Responde SOLO con JSON válido:
{{
  "narrative": "narrativa biosemiótica de 3-4 oraciones, poética pero anclada en los datos reales del contexto",
  "symmetry_index": 0.78,
  "fibonacci_alignment": "alta|media|baja"
}}"""
