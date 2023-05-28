from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route('/hello/<name>', methods=['GET'])
def hello(name):
    return "Hello, " + name + "!", 200

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "success"}), 200

@app.route('/download/', methods=['GET'], defaults={'response_size': 10000000})
@app.route('/download/<int:response_size>', methods=['GET'])
def download(response_size):
    if response_size and response_size > 0:
        data = b'\0' * response_size
    else:
        data = b'\0' * (10 ** 3) # 10MB of binary data
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return data, 200, {'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename=data-' + timestamp + '.bin'}

@app.route('/upload', methods=['POST'])
def upload():
    data = request.get_data()
    return jsonify({"status": "ok", "size": len(data)}), 200

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=10000)
