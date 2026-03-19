// background.js
// Routes requests from the content script to either local Ollama or Google Gemini.

const DEFAULT_OPTIONS = {
  useOllama: true,
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "llama2",
  geminiApiKey: "",
  useGemini: false,
};

function getOptions() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
      resolve(items);
    });
  });
}

async function queryOllama(prompt, opts) {
  const url = new URL(opts.ollamaEndpoint);
  // Ollama supports OpenAI-compatible endpoints, which is what we'll use.
  url.pathname = "/api/chat"; 

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.ollamaModel || "llama2",
      messages: [{ role: "user", content: prompt }],
      stream: false, // We want the full response
      options: {
        temperature: 0.0,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.statusText}`);
  }

  const data = await response.json();
  // The response structure for /api/chat is different from /v1/completions
  return data?.message?.content || "";
}

async function queryGemini(prompt, opts) {
  if (!opts.geminiApiKey) throw new Error("No Gemini API key configured");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${opts.geminiApiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.0,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Gemini API Error:", response.status, errorBody);
    throw new Error(`Gemini request failed: ${response.statusText}`);
  }

  const data = await response.json();
  // Extract the text content which should be a JSON string
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function buildPrompt(questions) {
  const questionData = questions.map((q, index) => {
    const choices = q.choices.map((c, idx) => ({
      key: String.fromCharCode(65 + idx),
      text: c,
    }));
    return {
      id: index,
      question: q.question,
      choices: choices,
    };
  });

  return `
    You are an expert assistant. For each multiple-choice question provided below, identify the correct answer.
    Your response MUST be a valid JSON object.
    The JSON object should contain a single key "answers", which is an array of objects.
    Each object in the array must have two keys: "questionId" (the original ID of the question) and "bestChoice" (the letter of the correct answer, e.g., "A", "B", "C").

    Here are the questions:
    ${JSON.stringify(questionData, null, 2)}
  `;
}

function parseResponse(responseText) {
    try {
        const json = JSON.parse(responseText);
        const answers = json.answers;
        if (!Array.isArray(answers)) return [];
        
        return answers.map(ans => ({
            questionId: ans.questionId,
            answer: ans.bestChoice,
        }));

    } catch (e) {
        console.error("Failed to parse LLM JSON response:", e, "\nRaw text:", responseText);
        // Fallback for non-JSON text responses, trying to be clever
        const lines = responseText.trim().split('\n');
        const answers = [];
        let questionIdCounter = 0;
        for (const line of lines) {
            const match = line.match(/\b([A-Z])\b/);
            if (match) {
                answers.push({ questionId: questionIdCounter++, answer: match[1] });
            }
        }
        return answers;
    }
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // We only care about this specific message type.
  // Return true to indicate we will respond asynchronously.
  if (message?.type !== "ASK_AI") return false;

  (async () => {
    try {
      const opts = await getOptions();
      const prompt = buildPrompt(message.payload);

      let responseText;
      if (opts.useGemini) {
        responseText = await queryGemini(prompt, opts);
      } else {
        responseText = await queryOllama(prompt, opts);
      }
      
      const answers = parseResponse(responseText);

      chrome.tabs.sendMessage(sender.tab.id, {
        type: "HIGHLIGHT_ANSWERS",
        payload: answers,
      });

    } catch (error) {
      console.error("MCQ Helper error", error);
      // Optionally, send an error message back to the content script
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "AI_ERROR",
        payload: { message: error.message },
      });
    }
  })();

  return true; // Keep the message channel open for the async response
});
