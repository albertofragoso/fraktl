import cv2
import numpy as np


def is_valid_tree_frame(image_bytes: bytes) -> tuple[bool, str]:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return False, "No se pudo leer la imagen"

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Check brightness
    if np.mean(gray) < 40:
        return False, "Necesitas más luz, busca mejor iluminación"

    # Check sharpness (Laplacian variance)
    if cv2.Laplacian(gray, cv2.CV_64F).var() < 50:
        return False, "Imagen borrosa, mantén la cámara estable"

    # Check for edges (tree structure)
    edges = cv2.Canny(gray, 50, 150)
    if np.sum(edges > 0) / edges.size < 0.001:
        return False, "Apunta al tronco del árbol"

    return True, "Árbol detectado"
