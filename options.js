// options.js

const DEFAULTS = {
    useOllama: true,
    useGemini: false,
    ollamaEndpoint: "http://localhost:11434",
    ollamaModel: "llama2",
    geminiApiKey: "",
};

const useOllamaRadio = document.getElementById("useOllama");
const useGeminiRadio = document.getElementById("useGemini");
const ollamaSettings = document.getElementById("ollama-settings");
const geminiSettings = document.getElementById("gemini-settings");

function setStatus(message, isError = false) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.style.color = isError ? "#b00" : "#080";
    setTimeout(() => status.textContent = "", 3000);
}

function updateVisibleSections() {
    ollamaSettings.style.display = useOllamaRadio.checked ? "block" : "none";
    geminiSettings.style.display = useGeminiRadio.checked ? "block" : "none";
}

function load() {
    chrome.storage.sync.get(DEFAULTS, (items) => {
        useOllamaRadio.checked = !items.useGemini;
        useGeminiRadio.checked = items.useGemini;
        
        document.getElementById("ollamaEndpoint").value = items.ollamaEndpoint;
        document.getElementById("ollamaModel").value = items.ollamaModel;
        document.getElementById("geminiApiKey").value = items.geminiApiKey;

        updateVisibleSections();
    });
}

function save() {
    const settings = {
        useGemini: useGeminiRadio.checked,
        ollamaEndpoint:
            document.getElementById("ollamaEndpoint").value.trim() ||
            DEFAULTS.ollamaEndpoint,
        ollamaModel:
            document.getElementById("ollamaModel").value.trim() ||
            DEFAULTS.ollamaModel,
        geminiApiKey: document.getElementById("geminiApiKey").value.trim() || "",
    };

    // useOllama is just the inverse of useGemini now
    settings.useOllama = !settings.useGemini;

    chrome.storage.sync.set(settings, () => {
        setStatus("Settings saved.");
        load(); // Reload to confirm everything is set correctly
    });
}

// Add event listeners once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("save").addEventListener("click", save);
    useOllamaRadio.addEventListener("change", updateVisibleSections);
    useGeminiRadio.addEventListener("change", updateVisibleSections);

    load();
});
