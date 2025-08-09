from flask import Flask, request, jsonify
import flask_cors
import requests
import os
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth

load_dotenv()
app = Flask(__name__)
flask_cors.CORS(app)

API_KEY = os.getenv("TYPINGDNA_API_KEY")
API_SECRET = os.getenv("TYPINGDNA_API_SECRET")

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
            print(r_verify.json())
            return jsonify({"status": "verified", "details": r_verify.json()})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)
