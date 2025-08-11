from flask import Flask, request, jsonify
import flask_cors
import requests
import os
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth
import json
from pathlib import Path
from datetime import datetime

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

if __name__ == "__main__":
    app.run(port=5000, debug=True)
