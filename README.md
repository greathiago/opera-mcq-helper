# MCQ Helper (Opera)

A simple Chromium extension (built for Opera/Chrome) that detects multiple-choice questions on a page and highlights the most likely answer using an LLM.

## How it works

1. The extension injects a content script (`content.js`) into each page.
2. It locates radio button groups and forms a prompt to send to an LLM.
3. The background script (`background.js`) forwards the prompt to either:
   - Local Ollama (`http://localhost:11434`) by default
   - Google Gemini (requires API key) if enabled
4. The AI response is used to highlight the chosen answer in the page.

## Setup

1. Start your local Ollama server (e.g. `ollama serve`).
2. Load the extension in Opera/Chrome:
   - Open `opera://extensions` (or `chrome://extensions`).
   - Enable "Developer mode".
   - Click "Load unpacked" and select this folder.

## Options

Open the options page from the extension UI to:

- Configure the Ollama endpoint.
- Enable Gemini and provide an API key.

## Packaging

Run the `package-extension.ps1` script to create a zip file for installation.
