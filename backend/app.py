from flask import Flask, request, jsonify
import requests
import os
import base64
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

API_KEY = os.getenv("TYPINGDNA_API_KEY")
API_SECRET = os.getenv("TYPINGDNA_API_SECRET")

@app.route("/typingdna/verify", methods=["POST"])
def verify_typing():
    data = request.get_json()
    user_id = data.get("userId")
    tp = data.get("tp")

    auth_header = base64.b64encode(f"{API_KEY}:{API_SECRET}".encode()).decode()

    try:
        r = requests.post(
            f"https://api.typingdna.com/auto/{user_id}",
            headers={
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={"tp": tp}
        )

        return jsonify(r.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
