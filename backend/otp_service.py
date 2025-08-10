import json
import random
import smtplib
import ssl
from email.message import EmailMessage
from pathlib import Path
from time import time
import os

BASE_DIR = Path(__file__).resolve().parent
OTP_STORE_PATH = BASE_DIR / "otp_store.json"

OTP_TTL_SECONDS = 5 * 60  # 5 minutes


def _load_store() -> dict:
    if not OTP_STORE_PATH.exists():
        return {}
    try:
        with OTP_STORE_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_store(store: dict) -> None:
    OTP_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OTP_STORE_PATH.open("w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


def _generate_otp() -> str:
    # 6-digit unique number per issuance
    return f"{random.randint(0, 999999):06d}"


def _cleanup_expired(store: dict) -> None:
    now = int(time())
    expired_keys = [k for k, v in store.items() if int(v.get("expiresAt", 0)) < now]
    for k in expired_keys:
        store.pop(k, None)


def send_email_otp(to_email: str, otp: str) -> None:
    smtp_user = os.getenv("SMTP_USER") or os.getenv("GMAIL_USER")
    smtp_pass = os.getenv("SMTP_PASS") or os.getenv("GMAIL_APP_PASSWORD")
    if not smtp_user or not smtp_pass:
        raise RuntimeError("SMTP credentials not configured. Set SMTP_USER and SMTP_PASS.")

    subject = "Your One-Time Password"
    body = f"Your OTP is: {otp}\n\nIt expires in 5 minutes. If you didn't request this, you can ignore this email."

    msg = EmailMessage()
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    context = ssl.create_default_context()
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls(context=context)
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)


def create_and_send_otp(email: str) -> None:
    store = _load_store()
    _cleanup_expired(store)
    otp = _generate_otp()
    # Save/replace OTP for this email
    store[email.lower()] = {
        "otp": otp,
        "expiresAt": int(time()) + OTP_TTL_SECONDS,
    }
    _save_store(store)
    send_email_otp(email, otp)


def verify_otp(email: str, otp: str) -> bool:
    store = _load_store()
    entry = store.get(email.lower())
    if not entry:
        return False
    now = int(time())
    if int(entry.get("expiresAt", 0)) < now:
        # expired; cleanup
        store.pop(email.lower(), None)
        _save_store(store)
        return False
    if str(entry.get("otp")) != str(otp):
        return False
    # consume OTP
    store.pop(email.lower(), None)
    _save_store(store)
    return True
