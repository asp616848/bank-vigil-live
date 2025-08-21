from flask import Flask, request, jsonify
import flask_cors
import requests
import os
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth
import json
from pathlib import Path
import random
from flask import session
from base64 import urlsafe_b64encode, urlsafe_b64decode
import os
from otp_service import create_and_send_otp, verify_otp
from flask import Flask, request, jsonify, session
from fido2.server import Fido2Server
from fido2.webauthn import PublicKeyCredentialRpEntity
from fido2 import cbor

# Temporary in-memory store (replace with DB in production)
user_credentials = {}

# Import OTP helpers

load_dotenv()
app = Flask(__name__)
flask_cors.CORS(app)

app.secret_key = os.urandom(32)

# Relying Party (your site) info
rp = PublicKeyCredentialRpEntity(id="localhost", name="My App")
server = Fido2Server(rp)


# For Phone OTP
otp_store = {}
credentials = {}

API_KEY = os.getenv("TYPINGDNA_API_KEY")
API_SECRET = os.getenv("TYPINGDNA_API_SECRET")

# --- Accounts storage helpers ---
BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = (BASE_DIR / ".." / "public").resolve()
OLD_ACCOUNTS_PATH = PUBLIC_DIR / "old-accounts.json"
NEW_ACCOUNTS_PATH = PUBLIC_DIR / "new-accounts.json"

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


def _update_account_phone(email: str, phone: str) -> bool:
    """Update or insert the 'phone' field for the account identified by email.
    Tries new-accounts.json first, then old-accounts.json. Returns True if updated.
    """
    email_l = (email or "").lower()

    # Try updating in new-accounts.json first
    new_accounts = _read_accounts_file(NEW_ACCOUNTS_PATH)
    updated = False
    for acc in new_accounts:
        if (acc.get("email") or "").lower() == email_l:
            acc["phone"] = phone
            updated = True
            break
    if updated:
        _write_accounts_file(NEW_ACCOUNTS_PATH, new_accounts)
        return True

    # Then try old-accounts.json
    old_accounts = _read_accounts_file(OLD_ACCOUNTS_PATH)
    for acc in old_accounts:
        if (acc.get("email") or "").lower() == email_l:
            acc["phone"] = phone
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

@app.route("/api/send-otp", methods=["POST"])
def send_phone_otp():
    phone = request.json.get("phone")
    if not phone:
        return jsonify({"error": "Phone number required"}), 400
    otp = str(random.randint(100000, 999999))
    otp_store[phone] = otp
    print(f"DEBUG: OTP for {phone} is {otp}")  # In production, send SMS here instead
    return jsonify({"message": "OTP sent"})

@app.route("/api/verify-otp", methods=["POST"])
def verify_phone_otp():
    body = request.get_json(force=True, silent=True) or {}
    phone = (body.get("phone") or "").strip()
    otp = (body.get("otp") or "").strip()
    email = (body.get("email") or "").strip()
    if not phone or not otp:
        return jsonify({"error": "Phone and OTP required"}), 400
    if otp_store.get(phone) == otp:
        # Optionally, delete OTP after successful verification
        otp_store.pop(phone, None)
        # Persist phone to account if we have the email
        updated = False
        if email:
            updated = _update_account_phone(email, phone)
        return jsonify({"message": "Verified", "updated": updated, "phone": phone})
    return jsonify({"error": "Invalid OTP"}), 400

def b64encode_bytes(data: bytes) -> str:
    return urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")

def b64decode_bytes(data: str) -> bytes:
    padding = '=' * (-len(data) % 4)
    return urlsafe_b64decode(data + padding)

@app.route("/webauthn/register-challenge")
def webauthn_register_challenge():
    # In real life, tie this to the logged-in user
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
    data = request.get_json()
    # Store credential in memory (replace with DB persistence)
    user_credentials[data["id"]] = data
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
    data = request.get_json()
    # TODO: Actually verify signature using stored public key (FIDO2 lib)
    # For now, pretend verification succeeds if ID exists
    if data.get("id") in user_credentials:
        return jsonify({"success": True})
    return jsonify({"error": "Verification failed"}), 400

@app.route("/webauthn/register", methods=["POST"])
def webauthn_register():
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
    return cbor.encode(registration_data)

@app.route("/webauthn/register/complete", methods=["POST"])
def webauthn_register_complete():
    data = cbor.decode(request.get_data())
    auth_data = server.register_complete(session["state"], data)
    
    # Save credential
    user_id = b"user123"
    credentials.setdefault(user_id, []).append(auth_data.credential_data)
    return jsonify({"status": "ok"})

@app.route("/webauthn/authenticate", methods=["POST"])
def webauthn_authenticate():
    user_id = b"user123"
    auth_data, state = server.authenticate_begin(credentials[user_id])
    session["state"] = state
    return cbor.encode(auth_data)

@app.route("/webauthn/authenticate/complete", methods=["POST"])
def webauthn_authenticate_complete():
    data = cbor.decode(request.get_data())
    server.authenticate_complete(session["state"], credentials[b"user123"], data)
    return jsonify({"status": "authenticated"})

if __name__ == "__main__":
    app.run(port=8000, debug=True)
