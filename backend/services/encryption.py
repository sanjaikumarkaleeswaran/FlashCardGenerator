# backend/services/encryption.py

import os
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Get key from environment, or derive it from JWT_SECRET as a fallback
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "super_secure_development_jwt_secret_key_32_chars")

def _get_aes_key() -> bytes:
    """Derive a 32-byte key suitable for AES-256 from our secret."""
    secret = ENCRYPTION_KEY or JWT_SECRET
    # Create a 32-byte SHA-256 digest
    return hashlib.sha256(secret.encode('utf-8')).digest()

def encrypt_text(plain_text: str) -> str:
    """
    Encrypt a text string using AES-GCM (AES-256).
    Returns a URL-safe Base64 encoded string containing nonce + ciphertext.
    """
    if not plain_text:
        return ""
    try:
        key = _get_aes_key()
        aesgcm = AESGCM(key)
        # Generate a standard 12-byte nonce
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plain_text.encode('utf-8'), None)
        # Combine nonce + ciphertext and encode
        encrypted_data = nonce + ciphertext
        return base64.urlsafe_b64encode(encrypted_data).decode('utf-8')
    except Exception as e:
        # Fallback to plain text if encryption fails to prevent app crash, but log it
        import logging
        logging.getLogger(__name__).error(f"Encryption failed: {e}")
        return plain_text

def decrypt_text(encrypted_text: str) -> str:
    """
    Decrypt an AES-GCM encrypted string.
    Returns the original plain text.
    """
    if not encrypted_text:
        return ""
    try:
        key = _get_aes_key()
        aesgcm = AESGCM(key)
        # Decode base64
        encrypted_data = base64.urlsafe_b64decode(encrypted_text.encode('utf-8'))
        # Split nonce and ciphertext
        nonce = encrypted_data[:12]
        ciphertext = encrypted_data[12:]
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        # If it's not encrypted (e.g. legacy plain text), return as is
        return encrypted_text
