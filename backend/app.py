# app.py
from flask import Flask, request, jsonify
import requests
import base64
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

TYPINGDNA_API_KEY = os.getenv("TYPINGDNA_API_KEY")
TYPINGDNA_API_SECRET = os.getenv("TYPINGDNA_API_SECRET")
BASE_URL = "https://api.typingdna.com"

auth_header = {
    "Authorization": "Basic " + base64.b64encode(f"{TYPINGDNA_API_KEY}:{TYPINGDNA_API_SECRET}".encode()).decode(),
    "Content-Type": "application/json"
}

@app.route("/api/2fa/check-user", methods=["GET"])
def check_user():
    email = request.args.get("email")
    if not email:
        return jsonify({"error": "Missing email"}), 400

    r = requests.get(f"{BASE_URL}/user/{email}", headers=auth_header)
    return jsonify(r.json()), r.status_code

@app.route("/api/2fa/start", methods=["POST"])
def start_verification():
    data = request.json
    email = data.get("email")
    if not email:
        return jsonify({"error": "Missing email"}), 400

    payload = {
        "type": 1  # 1 = OTP to email, you can change to 0 for SMS if you have phone
    }

    r = requests.post(f"{BASE_URL}/verify/send/{email}", headers=auth_header, json=payload)
    return jsonify(r.json()), r.status_code

@app.route("/api/2fa/verify", methods=["POST"])
def verify_code():
    data = request.json
    email = data.get("email")
    code = data.get("code")

    if not email or not code:
        return jsonify({"error": "Missing email or code"}), 400

    payload = {"code": code}
    r = requests.post(f"{BASE_URL}/verify/check/{email}", headers=auth_header, json=payload)
    return jsonify(r.json()), r.status_code

if __name__ == "__main__":
    app.run(debug=True)
