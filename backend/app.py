from flask import Flask, request, jsonify, session
import flask_cors
import requests
import os
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth
import json
from pathlib import Path
import random
from base64 import urlsafe_b64encode, urlsafe_b64decode
from datetime import datetime
from email.message import EmailMessage
import smtplib, ssl, uuid, secrets

# Import OTP helpers
from otp_service import (
    create_and_send_otp,
    verify_otp,
    create_and_store_phone_otp,
    verify_phone_otp,
)
# WebAuthn / FIDO2
from fido2.server import Fido2Server
from fido2.webauthn import PublicKeyCredentialRpEntity
from fido2 import cbor


load_dotenv()
app = Flask(__name__)
flask_cors.CORS(app)

# Secret key for Flask session (required for WebAuthn and session usage)
app.secret_key = os.urandom(32)

# -----------------------------
# Relying Party (your site) info (WebAuthn / FIDO2)
# -----------------------------
rp = PublicKeyCredentialRpEntity(id="localhost", name="My App")
server = Fido2Server(rp)

# -----------------------------
# In-memory stores (replace with DB in production)
# -----------------------------
# Phone OTP temporary store
otp_store = {}
# Simple WebAuthn store for passkey IDs (tisha-branch simple flow)
user_credentials = {}
# FIDO2 credential store for full ceremony (main data structure used by Fido2Server)
credentials = {}

# TypingDNA creds
API_KEY = os.getenv("TYPINGDNA_API_KEY")
API_SECRET = os.getenv("TYPINGDNA_API_SECRET")

# --- Accounts storage helpers ---
BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = (BASE_DIR / ".." / "public").resolve()
OLD_ACCOUNTS_PATH = PUBLIC_DIR / "old-accounts.json"
NEW_ACCOUNTS_PATH = PUBLIC_DIR / "new-accounts.json"
FINGERPRINT_LOGS_PATH = PUBLIC_DIR / "fingerprint-logs.json"
LOGIN_ATTEMPTS_PATH = BASE_DIR / "login_attempts.json"

def _read_accounts_file(path: Path):
    try:
        if not path.exists():
            return []
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return data.get("accounts", []) if isinstance(data, dict) else []
    except Exception:
        return []

def _write_accounts_file(path: Path, accounts: list):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(accounts, f, ensure_ascii=False, indent=2)

def _load_all_accounts():
    old_accounts = _read_accounts_file(OLD_ACCOUNTS_PATH)
    new_accounts = _read_accounts_file(NEW_ACCOUNTS_PATH)
    merged = {}
    for acc in new_accounts:
        email = (acc.get("email") or "").lower()
        if email:
            merged[email] = acc
    for acc in old_accounts:
        email = (acc.get("email") or "").lower()
        if email:
            merged[email] = acc  # old overrides new
    return list(merged.values())

  
def _update_account_phone(email: str, phone_e164: str) -> bool:
    """Add or update the phone field for the account with this email.
    Prefer updating in the file where the account exists; if present in both, old overrides new.
    """
    email_l = (email or "").lower()
    # Try new accounts first
    new_accounts = _read_accounts_file(NEW_ACCOUNTS_PATH)
    updated = False
    for acc in new_accounts:
        if (acc.get("email") or "").lower() == email_l:
            acc["phone"] = phone_e164
            updated = True
            break
    if updated:
        _write_accounts_file(NEW_ACCOUNTS_PATH, new_accounts)
        return True

    # Then old accounts
    old_accounts = _read_accounts_file(OLD_ACCOUNTS_PATH)
    for acc in old_accounts:
        if (acc.get("email") or "").lower() == email_l:
            acc["phone"] = phone_e164
            updated = True
            break
    if updated:
        _write_accounts_file(OLD_ACCOUNTS_PATH, old_accounts)
        return True

    return False
@app.route("/accounts", methods=["GET", "POST"])
def accounts():
    if request.method == "GET":
        accounts = _load_all_accounts()
        return jsonify({"accounts": accounts})
    
    data = request.get_json(force=True, silent=True) or {}
    required = ["email", "password", "name", "username"]
    if not all(k in data and isinstance(data[k], str) and data[k].strip() for k in required):
        return jsonify({"error": "Missing required fields"}), 400

    email_lower = data["email"].strip().lower()
    all_accounts = _load_all_accounts()
    if any((acc.get("email") or "").lower() == email_lower for acc in all_accounts):
        return jsonify({"error": "Account already exists"}), 409

    new_accounts = _read_accounts_file(NEW_ACCOUNTS_PATH)
    new_accounts.append({
        "email": data["email"].strip(),
        "password": data["password"],
        "name": data["name"].strip(),
        "username": data["username"].strip(),
    })
    _write_accounts_file(NEW_ACCOUNTS_PATH, new_accounts)
    return jsonify({"success": True, "account": data}), 201


# -----------------------------
# Email OTP with otp_service (from main)
# -----------------------------
@app.route('/otp/send', methods=['POST'])
def otp_send():
    body = request.get_json(force=True, silent=True) or {}
    email = (body.get('email') or '').strip()
    if not email:
        return jsonify({"error": "Email is required"}), 400
    try:
        create_and_send_otp(email)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/otp/verify', methods=['POST'])
def otp_verify():
    body = request.get_json(force=True, silent=True) or {}
    email = (body.get('email') or '').strip()
    otp = (body.get('otp') or '').strip()
    if not email or not otp:
        return jsonify({"error": "Email and OTP are required"}), 400
    ok = verify_otp(email, otp)
    return jsonify({"valid": ok}), (200 if ok else 401)


@app.route('/phone/send-otp', methods=['POST'])
def phone_send_otp():
    body = request.get_json(force=True, silent=True) or {}
    email = (body.get('email') or '').strip()
    phone = (body.get('phone') or '').strip()
    if not email or not phone:
        return jsonify({"error": "Email and phone are required"}), 400
    # Basic E.164 validation: + followed by 8-15 digits
    if not phone.startswith('+') or not phone[1:].isdigit() or not (8 <= len(phone[1:]) <= 15):
        return jsonify({"error": "Invalid phone format"}), 400
    try:
        # Create phone OTP and print to backend console
        create_and_store_phone_otp(email, phone)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/phone/verify-otp', methods=['POST'])
def phone_verify_otp():
    body = request.get_json(force=True, silent=True) or {}
    email = (body.get('email') or '').strip()
    otp = (body.get('otp') or '').strip()
    if not email or not otp:
        return jsonify({"error": "Email and OTP are required"}), 400
    ok, phone_e164 = verify_phone_otp(email, otp)
    if not ok or not phone_e164:
        return jsonify({"valid": False}), 401
    # Persist phone on the account
    if not _update_account_phone(email, phone_e164):
        return jsonify({"error": "Account not found"}), 404
    return jsonify({"valid": True, "phone": phone_e164})


@app.route("/typingdna/verify", methods=["POST"])
def verify_typing():
    data = request.get_json() or {}
    user_id = data.get("userId")
    tp = data.get("tp")
    textid = data.get("textid")

    if not user_id or not tp:
        return jsonify({"error": "Missing userId or typing pattern"}), 400
    try:
        # 1. Check user enrollments
        r_status = requests.get(
            f"https://api.typingdna.com/user/{user_id}",
            auth=HTTPBasicAuth(API_KEY, API_SECRET)
        )
        status_data = r_status.json()
        patterns_count = status_data.get("count", 0)

        # Build payload for save/verify
        payload = {"tp": tp}
        if textid:
            payload["textid"] = textid

        if patterns_count < 3:
            # 2. Enroll pattern
            r_save = requests.post(
                f"https://api.typingdna.com/save/{user_id}",
                data=payload,
                auth=HTTPBasicAuth(API_KEY, API_SECRET)
            )
            return jsonify({"status": "enrolled", "details": r_save.json()})
        else:
            # 3. Verify pattern
            r_verify = requests.post(
                f"https://api.typingdna.com/verify/{user_id}",
                data=payload,
                auth=HTTPBasicAuth(API_KEY, API_SECRET)
            )
            verify_data = r_verify.json()

            # Custom confidence gating
            confidence_threshold = 70
            verify_data["result"] = 1 if verify_data.get("score", 0) >= confidence_threshold else 0

            return jsonify({"status": "verified", "details": verify_data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------
# Password reset (from main)
# -----------------------------
def _update_account_password(email: str, new_password: str) -> bool:
    email_l = (email or "").lower()
    new_accounts = _read_accounts_file(NEW_ACCOUNTS_PATH)
    updated = False
    for acc in new_accounts:
        if (acc.get("email") or "").lower() == email_l:
            acc["password"] = new_password
            updated = True
            break
    if updated:
        _write_accounts_file(NEW_ACCOUNTS_PATH, new_accounts)
        return True

    old_accounts = _read_accounts_file(OLD_ACCOUNTS_PATH)
    for acc in old_accounts:
        if (acc.get("email") or "").lower() == email_l:
            acc["password"] = new_password
            updated = True
            break
    if updated:
        _write_accounts_file(OLD_ACCOUNTS_PATH, old_accounts)
        return True

    return False

@app.route('/accounts/reset-password', methods=['POST'])
def reset_password():
    body = request.get_json(force=True, silent=True) or {}
    email = (body.get('email') or '').strip()
    otp = (body.get('otp') or '').strip()
    new_password = (body.get('newPassword') or '')
    if not email or not otp or not new_password:
        return jsonify({"error": "Email, OTP and newPassword are required"}), 400
    if not verify_otp(email, otp):
        return jsonify({"error": "Invalid or expired OTP"}), 401
    if not _update_account_password(email, new_password):
        return jsonify({"error": "Account not found"}), 404
    return jsonify({"success": True})


# -----------------------------
# Phone OTP (tisha-branch feature)
# -----------------------------
@app.route("/api/send-otp", methods=["POST"])
def send_phone_otp():
    phone = (request.json or {}).get("phone")
    if not phone:
        return jsonify({"error": "Phone number required"}), 400
    otp = str(random.randint(100000, 999999))
    otp_store[phone] = otp
    # NOTE: Replace this print with real SMS integration in production
    print(f"DEBUG: OTP for {phone} is {otp}")
    return jsonify({"message": "OTP sent"})

@app.route("/api/verify-otp", methods=["POST"])
def verify_phone_otp():
    payload = request.json or {}
    phone = payload.get("phone")
    otp = payload.get("otp")
    if not phone or not otp:
        return jsonify({"error": "Phone and OTP required"}), 400
    if otp_store.get(phone) == otp:
        otp_store.pop(phone, None)
        return jsonify({"message": "Verified"})
    return jsonify({"error": "Invalid OTP"}), 400


# -----------------------------
# WebAuthn helpers (tisha-branch feature)
# -----------------------------
def b64encode_bytes(data: bytes) -> str:
    return urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")

def b64decode_bytes(data: str) -> bytes:
    padding = '=' * (-len(data) % 4)
    return urlsafe_b64decode(data + padding)

# Lightweight challenge / registration (simple store)
@app.route("/webauthn/register-challenge")
def webauthn_register_challenge():
    user_id = os.urandom(16)
    session["current_challenge"] = os.urandom(32)

    publicKey = {
        "challenge": b64encode_bytes(session["current_challenge"]),
        "rp": {"name": "MyApp", "id": request.host.split(":")[0]},
        "user": {
            "id": b64encode_bytes(user_id),
            "name": "user@example.com",
            "displayName": "Example User"
        },
        "pubKeyCredParams": [{"type": "public-key", "alg": -7}],
        "timeout": 60000,
        "attestation": "direct"
    }
    return jsonify(publicKey)

@app.route("/webauthn/register-credential", methods=["POST"])
def webauthn_register_credential():
    data = request.get_json() or {}
    # Store credential in memory (replace with DB persistence)
    cred_id = data.get("id")
    if not cred_id:
        return jsonify({"error": "Missing credential id"}), 400
    user_credentials[cred_id] = data
    return jsonify({"success": True})

@app.route("/webauthn/authenticate-challenge")
def webauthn_authenticate_challenge():
    session["current_challenge"] = os.urandom(32)
    allow_credentials = [
        {"type": "public-key", "id": b64encode_bytes(b64decode_bytes(k))}
        for k in user_credentials.keys()
    ] if user_credentials else None

    publicKey = {
        "challenge": b64encode_bytes(session["current_challenge"]),
        "timeout": 60000,
        "rpId": request.host.split(":")[0],
        "allowCredentials": allow_credentials
    }
    return jsonify(publicKey)

@app.route("/webauthn/verify-assertion", methods=["POST"])
def webauthn_verify_assertion():
    data = request.get_json() or {}
    # Placeholder: verify signature using stored public key in production
    if data.get("id") in user_credentials:
        return jsonify({"success": True})
    return jsonify({"error": "Verification failed"}), 400

# Full FIDO2 ceremony (uses Fido2Server from main codebase)
@app.route("/webauthn/register", methods=["POST"])
def webauthn_register():
    # Replace with your actual logged-in user mapping
    user = {
        "id": b"user123",
        "name": "user@example.com",
        "displayName": "User Example"
    }
    registration_data, state = server.register_begin(
        user,
        credentials.get(user["id"], []),
        user_verification="preferred"
    )
    session["state"] = state
    return app.response_class(cbor.encode(registration_data), mimetype="application/cbor")

@app.route("/webauthn/register/complete", methods=["POST"])
def webauthn_register_complete():
    data = cbor.decode(request.get_data())
    auth_data = server.register_complete(session["state"], data)
    user_id = b"user123"
    credentials.setdefault(user_id, []).append(auth_data.credential_data)
    return jsonify({"status": "ok"})

@app.route("/webauthn/authenticate", methods=["POST"])
def webauthn_authenticate():
    user_id = b"user123"
    if user_id not in credentials or not credentials[user_id]:
        return jsonify({"error": "No credentials registered"}), 400
    auth_data, state = server.authenticate_begin(credentials[user_id])
    session["state"] = state
    return app.response_class(cbor.encode(auth_data), mimetype="application/cbor")

@app.route("/webauthn/authenticate/complete", methods=["POST"])
def webauthn_authenticate_complete():
    data = cbor.decode(request.get_data())
    server.authenticate_complete(session["state"], credentials[b"user123"], data)
    return jsonify({"status": "authenticated"})


# -----------------------------
# Security: fingerprint logging (from main)
# -----------------------------
@app.route('/security/log-fingerprint', methods=['POST'])
def log_fingerprint():
    """Log fingerprint data for security monitoring"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        if not data.get('action') or not data.get('fingerprint'):
            return jsonify({"error": "Missing required fields"}), 400
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": data.get('action'),
            "email": data.get('email'),
            "fingerprint": data.get('fingerprint'),
            "user_agent": data.get('userAgent'),
            "client_timestamp": data.get('timestamp')
        }
        
        logs = []
        if FINGERPRINT_LOGS_PATH.exists():
            try:
                with FINGERPRINT_LOGS_PATH.open("r", encoding="utf-8") as f:
                    logs = json.load(f)
            except Exception:
                logs = []
        
        logs.append(log_entry)
        if len(logs) > 1000:
            logs = logs[-1000:]
        
        FINGERPRINT_LOGS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with FINGERPRINT_LOGS_PATH.open("w", encoding="utf-8") as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)
        
        return jsonify({"success": True})
    
    except Exception as e:
        print(f"Error logging fingerprint: {e}")
        return jsonify({"error": "Failed to log fingerprint"}), 500

@app.route('/security/fingerprint-logs', methods=['GET'])
def get_fingerprint_logs():
    """Get fingerprint logs for security analysis"""
    try:
        if not FINGERPRINT_LOGS_PATH.exists():
            return jsonify({"logs": []})
        
        with FINGERPRINT_LOGS_PATH.open("r", encoding="utf-8") as f:
            logs = json.load(f)
        
        email_filter = request.args.get('email')
        action_filter = request.args.get('action')
        
        if email_filter:
            logs = [log for log in logs if log.get('email', '').lower() == email_filter.lower()]
        
        if action_filter:
            logs = [log for log in logs if log.get('action') == action_filter]
        
        logs.reverse()
        return jsonify({"logs": logs[:100]})
    
    except Exception as e:
        print(f"Error retrieving fingerprint logs: {e}")
        return jsonify({"error": "Failed to retrieve logs"}), 500


# -----------------------------
# Security: login attempt alerts via email (from main)
# -----------------------------
def _send_email(to_email: str, subject: str, body: str):
    smtp_user = os.getenv("SMTP_USER") or os.getenv("GMAIL_USER")
    smtp_pass = os.getenv("SMTP_PASS") or os.getenv("GMAIL_APP_PASSWORD")
    if not smtp_user or not smtp_pass:
        raise RuntimeError("SMTP credentials not configured. Set SMTP_USER and SMTP_PASS.")
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

def _load_login_attempts():
    if not LOGIN_ATTEMPTS_PATH.exists():
        return []
    try:
        with LOGIN_ATTEMPTS_PATH.open('r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []

def _save_login_attempts(attempts: list):
    LOGIN_ATTEMPTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOGIN_ATTEMPTS_PATH.open('w', encoding='utf-8') as f:
        json.dump(attempts, f, ensure_ascii=False, indent=2)

def _compose_login_alert_email(attempt: dict) -> tuple[str, str]:
    base_url = os.getenv('APP_EXTERNAL_BASE_URL') or 'http://localhost:5000'
    token = attempt['token']
    confirm_url = f"{base_url}/security/login-attempt/confirm?token={token}"
    report_url = f"{base_url}/security/login-attempt/report?token={token}"

    subject = f"New login to your account from {attempt.get('device', {}).get('browser') or 'an unknown device'}"
    lines = [
        f"Hi {attempt.get('email')},",
        "",
        "We detected a sign-in to your account:",
        f"Time (UTC): {attempt.get('timestamp')}",
        f"IP Address: {attempt.get('ip') or 'N/A'}",
        f"Location (approx): {attempt.get('location') or 'N/A'}",
        f"Browser: {attempt.get('device', {}).get('browser') or (attempt.get('user_agent') or '')[:40]}",
        f"OS / Platform: {attempt.get('device', {}).get('os') or 'N/A'}",
        f"Device Fingerprint: {attempt.get('fingerprint') or 'N/A'}",
        f"Risk Score: {attempt.get('risk', {}).get('score', 'N/A')}",
        f"Risk Flags: {', '.join(attempt.get('risk', {}).get('reasons', [])) or 'None'}",
        "",
        "If this was you, you can safely confirm below.",
        "If this was NOT you, report it immediately so we can help secure your account.",
        "",
        f"YES, IT WAS ME: {confirm_url}",
        f"NO, SECURE MY ACCOUNT: {report_url}",
        "",
        "If you did not initiate this and report it, we will invalidate active sessions and may require a password reset/OTP verification.",
        "",
        "Security Tip: Enable multi-factor authentication and review recent security logs in your profile.",
        "",
        "Thank you,",
        "Security Team"
    ]
    body = "\n".join(lines)
    return subject, body

def _create_login_attempt(payload: dict) -> dict:
    attempts = _load_login_attempts()
    attempt = {
        "id": uuid.uuid4().hex,
        "token": secrets.token_urlsafe(24),
        "email": (payload.get('email') or '').strip().lower(),
        "timestamp": datetime.utcnow().isoformat(),
        "ip": payload.get('ip') or request.remote_addr,
        "user_agent": payload.get('userAgent') or request.headers.get('User-Agent'),
        "fingerprint": payload.get('fingerprint'),
        "device": payload.get('device') or {},  # {browser, os, platform, mobile}
        "risk": payload.get('risk') or {},      # {score, reasons: []}
        "location": payload.get('location'),
        "status": "pending"
    }
    attempts.append(attempt)
    if len(attempts) > 500:
        attempts = attempts[-500:]
    _save_login_attempts(attempts)
    return attempt

def _update_attempt_status(token: str, status: str) -> dict | None:
    attempts = _load_login_attempts()
    updated = None
    for a in attempts:
        if a.get('token') == token:
            a['status'] = status
            a['responded_at'] = datetime.utcnow().isoformat()
            updated = a
            break
    if updated:
        _save_login_attempts(attempts)
    return updated

@app.route('/security/login-attempt', methods=['POST'])
def record_login_attempt():
    body = request.get_json(force=True, silent=True) or {}
    email = (body.get('email') or '').strip()
    if not email:
        return jsonify({'error': 'email required'}), 400
    attempt = _create_login_attempt(body)
    try:
        subject, body_txt = _compose_login_alert_email(attempt)
        _send_email(email, subject, body_txt)
    except Exception as e:
        return jsonify({'attemptId': attempt['id'], 'status': attempt['status'], 'emailError': str(e)}), 500
    return jsonify({'attemptId': attempt['id'], 'status': attempt['status']}), 201

@app.route('/security/login-attempt/confirm', methods=['GET'])
def confirm_login_attempt():
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'token required'}), 400
    updated = _update_attempt_status(token, 'confirmed')
    if not updated:
        return jsonify({'error': 'invalid token'}), 404
    return jsonify({'success': True, 'attempt': updated})

@app.route('/security/login-attempt/report', methods=['GET'])
def report_login_attempt():
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'token required'}), 400
    updated = _update_attempt_status(token, 'reported')
    if not updated:
        return jsonify({'error': 'invalid token'}), 404
    # TODO: add automated responses (invalidate sessions, flag account, force password reset)
    return jsonify({'success': True, 'attempt': updated})

@app.route('/security/login-attempt/respond', methods=['POST'])
def respond_login_attempt():
    body = request.get_json(force=True, silent=True) or {}
    token = body.get('token')
    decision = body.get('decision')  # 'confirm' | 'report'
    if decision not in ('confirm', 'report'):
        return jsonify({'error': 'decision must be confirm or report'}), 400
    status = 'confirmed' if decision == 'confirm' else 'reported'
    updated = _update_attempt_status(token, status)
    if not updated:
        return jsonify({'error': 'invalid token'}), 404
    return jsonify({'success': True, 'attempt': updated})


# -----------------------------
# App runner
# -----------------------------
if __name__ == "__main__":
    app.run(port=8000, debug=True)
