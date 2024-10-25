import os
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
from llm_axe import OnlineAgent, OllamaChat
import requests

# Load environment variables
load_dotenv()

# Initialize the Flask app
app = Flask(__name__, static_folder='static', static_url_path='')

# Initialize the AI model and agents
llm = OllamaChat(model="dolphin-llama3")
online_agent = OnlineAgent(llm)

# In-memory storage for chat history
chat_history = {}

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message')
    chat_id = data.get('chatId')
    web_access = data.get('webAccess', False)

    if not chat_id:
        return jsonify({"error": "Chat ID is required"}), 400

    if chat_id not in chat_history:
        chat_history[chat_id] = {"name": f"Chat {chat_id}", "messages": []}

    chat_history[chat_id]["messages"].append({"role": "user", "content": user_message})

    try:
        if web_access:
            response = online_agent.search(user_message)
        else:
            ai_data = {
                "model": "dolphin-llama3",
                "messages": [
                    {"role": "system", "content": "Your name is Shira an helpful AI assistant, developed by Galactic ARK. Provide your response in Markdown language."},
                    {"role": "user", "content": user_message}
                ]
            }
            ai_response = requests.post(
                'http://localhost:11434/v1/chat/completions',
                headers={"Content-Type": "application/json"},
                json=ai_data
            )
            if ai_response.status_code == 200:
                response = ai_response.json()['choices'][0]['message']['content']
            else:
                return jsonify({
                    "error": "Failed to communicate with AI model",
                    "status_code": ai_response.status_code,
                    "details": ai_response.text
                }), 500

        chat_history[chat_id]["messages"].append({"role": "assistant", "content": response})
        return jsonify({"response": response})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
