# Solendir – Unified Company AI Assistant

![Solendir Screenshot](assets/Solendir.png)

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Made with Next.js](https://img.shields.io/badge/Next.js-2025-blue?logo=next.js)](https://nextjs.org/)
[![Made with FastAPI](https://img.shields.io/badge/FastAPI-2025-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Llama3 Powered](https://img.shields.io/badge/LLM-Llama3-orange)](https://ollama.com/)

---

**Solendir** is a next-generation AI assistant platform that unifies scattered company information and makes onboarding, knowledge sharing, and productivity seamless for teams of any size.

## 🚀 Features

- **Modern ChatGPT-style UI**: Persistent chat history, multi-chat sidebar, avatars, timestamps, and markdown rendering.
- **App Integrations**: Connect Notion, Gmail, Trello, and more. Users securely add, view, and disconnect their own API keys.
- **Context-aware AI**: Uses Llama3 (via Ollama) to answer questions using real company data (e.g., "What Notion pages do I have?").
- **Persistent Connections**: App and chat history persist across sessions, with auto-reconnect for integrations.
- **LLM-generated chat titles**: Smart, relevant chat summaries for easy navigation.
- **Dark Mode**: Beautiful, responsive design for a premium, professional feel.

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, React Markdown
- **Backend**: FastAPI (Python), httpx
- **AI**: Llama3 via Ollama (local inference)
- **Integrations**: Notion API, Trello API, Gmail API

## 📸 Screenshot

![Solendir Screenshot](assets/Solendir.png)

## ⚡ Getting Started

1. **Clone the repo:**
   ```sh
   git clone https://github.com/Kushsharma1/Solendir.git
   cd Solendir
   ```
2. **Backend setup:**
   ```sh
   python3 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   cd backend
   uvicorn main:app --reload --port 8000
   ```
3. **Frontend setup:**
   ```sh
   cd frontend
   npm install
   npm run dev
   ```
4. **Ollama (Llama3) setup:**
   - [Install Ollama](https://ollama.com/download)
   - Run: `ollama pull llama3` and `ollama serve`

5. **Open the app:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend: [http://localhost:8000](http://localhost:8000)

## 🌐 Links

- [Live Demo](#) <!-- Add your live link here -->
- [View on GitHub](https://github.com/Kushsharma1/Solendir)

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

> Built with ❤️ by Kush Sharma 