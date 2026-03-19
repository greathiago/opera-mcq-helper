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
const ollamaSettings = document.getElementById("ollama-settings-container");
const geminiSettings = document.getElementById("gemini-settings-container");

function setStatus(message, isError = false) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.style.color = isError ? "#FF3B30" : "#34C759"; // Apple Red/Green
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
        const currentModel = items.ollamaModel;
        document.getElementById("geminiApiKey").value = items.geminiApiKey;

        updateVisibleSections();
        fetchModels(items.ollamaEndpoint, currentModel);
    });
}

async function fetchModels(endpoint, currentModel) {
    const modelSelect = document.getElementById("ollamaModel");
    const originalValue = modelSelect.value || currentModel;
    modelSelect.innerHTML = '<option value="">Carregando...</option>';

    try {
        const url = new URL(endpoint.startsWith('http') ? endpoint : 'http://' + endpoint);
        url.pathname = "/api/tags";
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error();
        
        const data = await response.json();
        modelSelect.innerHTML = '';
        
        if (data.models && data.models.length > 0) {
            data.models.forEach(m => {
                const opt = document.createElement("option");
                opt.value = m.name;
                opt.textContent = m.name;
                if (m.name === originalValue) opt.selected = true;
                modelSelect.appendChild(opt);
            });
        } else {
          modelSelect.innerHTML = '<option value="">Nenhum modelo encontrado</option>';
        }
    } catch (e) {
        modelSelect.innerHTML = '<option value="">Erro ao conectar ao Ollama</option>';
        if (originalValue) {
            const opt = document.createElement("option");
            opt.value = originalValue;
            opt.textContent = originalValue + " (atual)";
            opt.selected = true;
            modelSelect.appendChild(opt);
        }
    }
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
    document.getElementById("refreshModels").addEventListener("click", (e) => {
        e.preventDefault();
        fetchModels(document.getElementById("ollamaEndpoint").value, document.getElementById("ollamaModel").value);
    });
    document.getElementById("ollamaEndpoint").addEventListener("change", () => {
        fetchModels(document.getElementById("ollamaEndpoint").value, document.getElementById("ollamaModel").value);
    });
    useOllamaRadio.addEventListener("change", updateVisibleSections);
    useGeminiRadio.addEventListener("change", updateVisibleSections);

    load();
});
