import os
import base64
from typing import Optional, List, Tuple

import cv2 as cv
import numpy as np


MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
DETECT_MODEL = os.path.join(MODEL_DIR, "face_detection_yunet_2023mar.onnx")
RECOG_MODEL = os.path.join(MODEL_DIR, "face_recognition_sface_2021dec.onnx")


class FaceService:
    def __init__(self):
        self.models_available = os.path.exists(DETECT_MODEL) and os.path.exists(RECOG_MODEL)

        if self.models_available:
            self.detector = cv.FaceDetectorYN.create(
                DETECT_MODEL,
                "",
                (320, 320),
                0.9,
                0.3,
                5000
            )
            self.recognizer = cv.FaceRecognizerSF.create(RECOG_MODEL, "")
        else:
            self.detector = None
            self.recognizer = None

    def _b64_to_image(self, image_b64: str) -> np.ndarray:
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(image_b64)
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv.imdecode(arr, cv.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")
        return img

    def detect_faces(self, image: np.ndarray):
        if not self.models_available:
            return None

        h, w = image.shape[:2]
        self.detector.setInputSize((w, h))
        _, faces = self.detector.detect(image)
        return faces

    def extract_embedding(self, image: np.ndarray) -> np.ndarray:
        if not self.models_available:
            # fallback demo embedding using resized grayscale histogram
            gray = cv.cvtColor(image, cv.COLOR_BGR2GRAY)
            small = cv.resize(gray, (32, 32)).flatten().astype(np.float32)
            norm = np.linalg.norm(small)
            if norm == 0:
                raise ValueError("Invalid image embedding")
            return (small / norm).reshape(1, -1)

        faces = self.detect_faces(image)
        if faces is None or len(faces) == 0:
            raise ValueError("No face detected")

        face = faces[0]
        aligned = self.recognizer.alignCrop(image, face)
        feat = self.recognizer.feature(aligned)
        return feat.copy()

    def cosine_similarity(self, feat1: np.ndarray, feat2: np.ndarray) -> float:
        if self.models_available:
            return float(self.recognizer.match(feat1, feat2, cv.FaceRecognizerSF_FR_COSINE))

        feat1 = feat1.flatten()
        feat2 = feat2.flatten()
        denom = (np.linalg.norm(feat1) * np.linalg.norm(feat2))
        if denom == 0:
            return 0.0
        return float(np.dot(feat1, feat2) / denom)

    def average_embedding_from_base64(self, images_b64: List[str]) -> np.ndarray:
        feats = []
        for img_b64 in images_b64:
            img = self._b64_to_image(img_b64)
            feat = self.extract_embedding(img)
            feats.append(feat)

        if not feats:
            raise ValueError("No valid face embeddings created")

        mean_feat = np.mean(np.vstack(feats), axis=0, keepdims=True).astype(np.float32)
        return mean_feat

    def average_embedding_from_files(self, file_paths: List[str]) -> np.ndarray:
        feats = []
        for path in file_paths:
            img = cv.imread(path)
            if img is None:
                continue
            feat = self.extract_embedding(img)
            feats.append(feat)

        if not feats:
            raise ValueError("No valid enrolled face embeddings found")

        mean_feat = np.mean(np.vstack(feats), axis=0, keepdims=True).astype(np.float32)
        return mean_feat

    def match_against_gallery(
        self,
        probe_images_b64: List[str],
        gallery: List[Tuple[int, str, List[str]]],
        cosine_threshold: float = 0.363,
    ) -> Optional[dict]:
        probe_feat = self.average_embedding_from_base64(probe_images_b64)

        best = None
        best_score = -1.0

        for student_id, student_name, file_paths in gallery:
            try:
                gallery_feat = self.average_embedding_from_files(file_paths)
                score = self.cosine_similarity(probe_feat, gallery_feat)
            except Exception:
                continue

            if score > best_score:
                best_score = score
                best = {
                    "student_id": student_id,
                    "student_name": student_name,
                    "confidence": round(score * 100, 2),
                    "cosine_score": score,
                }

        if best is None:
            return None

        # looser threshold for fallback mode
        threshold = cosine_threshold if self.models_available else 0.80

        if best["cosine_score"] < threshold:
            return None

        return best