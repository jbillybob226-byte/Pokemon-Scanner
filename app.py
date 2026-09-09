from flask import Flask, request, jsonify
from scraper import get_card
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])
# Define the route for the home page (the root URL '/')
@app.get('/pokemon')
def callApi():
    query = request.args.get("q")
    return jsonify(get_card(query))

# Run the app locally if this file is executed directly
if __name__ == '__main__':
    app.run(debug=True)