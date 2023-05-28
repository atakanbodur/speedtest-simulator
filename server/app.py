from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "success"}), 200

@app.route('/download', methods=['GET'])
def download():
    data = b'\0' * (10 * 1024 * 1024) # 10MB of binary data
    return data, 200

@app.route('/upload', methods=['POST'])
def upload():
    data = request.get_data()
    return jsonify({"status": "ok", "size": len(data)}), 200

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
