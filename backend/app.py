from flask import Flask, request, jsonify
import flask_cors
import requests
import os
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth
import json
from pathlib import Path
from datetime import datetime
from email.message import EmailMessage
import smtplib, ssl, uuid, secrets

# Import OTP helpers
from otp_service import create_and_send_otp, verify_otp

load_dotenv()
app = Flask(__name__)
flask_cors.CORS(app)

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
            # File format is an array of accounts
            if isinstance(data, list):
                return data
            # In case file accidentally contains an object
            return data.get("accounts", []) if isinstance(data, dict) else []
    except Exception:
        # On parse error, treat as empty to avoid breaking login
        return []


def _write_accounts_file(path: Path, accounts: list):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(accounts, f, ensure_ascii=False, indent=2)


def _load_all_accounts():
    old_accounts = _read_accounts_file(OLD_ACCOUNTS_PATH)
    new_accounts = _read_accounts_file(NEW_ACCOUNTS_PATH)
    # Merge unique by email (case-insensitive), prefer old over new
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


@app.route("/accounts", methods=["GET", "POST"])
def accounts():
    if request.method == "GET":
        accounts = _load_all_accounts()
        return jsonify({"accounts": accounts})
    
    # POST -> create new account in new-accounts.json if not existing in either file
    data = request.get_json(force=True, silent=True) or {}
    required = ["email", "password", "name", "username"]
    if not all(k in data and isinstance(data[k], str) and data[k].strip() for k in required):
        return jsonify({"error": "Missing required fields"}), 400

    email_lower = data["email"].strip().lower()
    all_accounts = _load_all_accounts()
    # Ensure user id (email) not in old or new accounts
    if any((acc.get("email") or "").lower() == email_lower for acc in all_accounts):
        return jsonify({"error": "Account already exists"}), 409

    # Append to new-accounts.json
    new_accounts = _read_accounts_file(NEW_ACCOUNTS_PATH)
    new_accounts.append({
        "email": data["email"].strip(),
        "password": data["password"],
        "name": data["name"].strip(),
        "username": data["username"].strip(),
    })
    _write_accounts_file(NEW_ACCOUNTS_PATH, new_accounts)
    return jsonify({"success": True, "account": data}), 201


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


@app.route("/typingdna/verify", methods=["POST"])
def verify_typing():
    data = request.get_json()
    user_id = data.get("userId")
    tp = data.get("tp")
    textid = data.get("textid")

    if not user_id or not tp:
        return jsonify({"error": "Missing userId or typing pattern"}), 400
    try:
        # 1. Check user enrollments
        r_status = requests.get(f"https://api.typingdna.com/user/{user_id}",
                                auth=HTTPBasicAuth(API_KEY, API_SECRET))
        status_data = r_status.json()
        patterns_count = status_data.get("count", 0)

        if patterns_count < 3:
            # 2. Enroll pattern
            payload = {"tp": tp}
            if textid:
                payload["textid"] = textid
            r_save = requests.post(f"https://api.typingdna.com/save/{user_id}",
                                   data=payload,
                                   auth=HTTPBasicAuth(API_KEY, API_SECRET))
            return jsonify({"status": "enrolled", "details": r_save.json()})
        else:
            # 3. Verify pattern
            payload = {"tp": tp}
            if textid:
                payload["textid"] = textid
            r_verify = requests.post(f"https://api.typingdna.com/verify/{user_id}",
                                     data=payload,
                                     auth=HTTPBasicAuth(API_KEY, API_SECRET))
            verify_data = r_verify.json()
            
            # Custom confidence check
            confidence_threshold = 70 
            if verify_data.get("score", 0) >= confidence_threshold:
                verify_data["result"] = 1 # Force result to 1 if confidence is met
            else:
                verify_data["result"] = 0

            print(verify_data)
            return jsonify({"status": "verified", "details": verify_data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _update_account_password(email: str, new_password: str) -> bool:
    email_l = (email or "").lower()
    # Try new accounts first
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

    # Then old accounts
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

    # verify OTP
    if not verify_otp(email, otp):
        return jsonify({"error": "Invalid or expired OTP"}), 401

    # update password in the appropriate JSON file
    if not _update_account_password(email, new_password):
        return jsonify({"error": "Account not found"}), 404

    return jsonify({"success": True})

@app.route('/security/log-fingerprint', methods=['POST'])
def log_fingerprint():
    """Log fingerprint data for security monitoring"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        # Validate required fields
        if not data.get('action') or not data.get('fingerprint'):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Add server timestamp
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": data.get('action'),
            "email": data.get('email'),
            "fingerprint": data.get('fingerprint'),
            "user_agent": data.get('userAgent'),
            "client_timestamp": data.get('timestamp')
        }
        
        # Read existing logs
        logs = []
        if FINGERPRINT_LOGS_PATH.exists():
            try:
                with FINGERPRINT_LOGS_PATH.open("r", encoding="utf-8") as f:
                    logs = json.load(f)
            except Exception:
                logs = []
        
        # Append new log entry
        logs.append(log_entry)
        
        # Keep only last 1000 entries to prevent file from growing too large
        if len(logs) > 1000:
            logs = logs[-1000:]
        
        # Write back to file
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
        
        # Optional: filter by email or action
        email_filter = request.args.get('email')
        action_filter = request.args.get('action')
        
        if email_filter:
            logs = [log for log in logs if log.get('email', '').lower() == email_filter.lower()]
        
        if action_filter:
            logs = [log for log in logs if log.get('action') == action_filter]
        
        # Return most recent first
        logs.reverse()
        
        return jsonify({"logs": logs[:100]})  # Return last 100 entries
    
    except Exception as e:
        print(f"Error retrieving fingerprint logs: {e}")
        return jsonify({"error": "Failed to retrieve logs"}), 500

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

# --- Login attempt alert helpers ---

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
        f"Browser: {attempt.get('device', {}).get('browser') or attempt.get('user_agent')[:40]}",
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
        "location": payload.get('location'),    # optional geolocation string
        "status": "pending"
    }
    attempts.append(attempt)
    # keep last 500
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
        # still return attempt but indicate email failed
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

if __name__ == "__main__":
    app.run(port=5000, debug=True)
