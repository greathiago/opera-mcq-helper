// content.js
// Detects simple multiple choice questions (radio groups) and highlights the chosen answer

const HIGHLIGHT_CSS = `
.mchighlight { background-color: rgba(255, 255, 0, 0.55); border-radius: 4px; box-shadow: 0 0 5px rgba(0,0,0,0.3); }
`;

// Store blocks globally so we don't have to re-discover them.
let questionBlocks = [];

function injectStyles() {
  if (document.getElementById("mchighlight-style")) return;
  const style = document.createElement("style");
  style.id = "mchighlight-style";
  style.textContent = HIGHLIGHT_CSS;
  document.head.appendChild(style);
}

function discoverQuestionBlocks() {
  // Simple heuristic: find radio button groups.
  // This is fragile and will not work for many sites.
  const radios = Array.from(document.querySelectorAll("input[type=radio]"));
  if (!radios.length) return [];

  const groups = new Map();
  radios.forEach((radio) => {
    // Group radios by name, which usually corresponds to a single question.
    const name = radio.name || radio.id || radio.form?.id || "__anonymous__";
    if (!name) return; // Skip radios without a name or group identifier
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(radio);
  });

  const blocks = [];
  let blockIdCounter = 0;
  groups.forEach((group, name) => {
    // Find the nearest common ancestor to represent the question block.
    const container = group[0].closest("form") || group[0].closest("fieldset") || document.body;

    const choices = group.map((radio, idx) => {
      const label = document.querySelector(`label[for="${radio.id}"]`) || radio.closest("label");
      // Fallback to the radio's value if no label text is found.
      const text = label ? label.innerText.trim() : (radio.value || `Choice ${idx + 1}`);
      return {
        key: String.fromCharCode(65 + idx), // A, B, C...
        radio,
        label,
        text,
      };
    });

    // A rough heuristic to find the question text.
    const questionText = (container.innerText || "").split('\n')[0].trim();

    blocks.push({
      id: blockIdCounter++,
      name,
      container,
      questionText,
      choices,
    });
  });

  return blocks;
}

function clearHighlights() {
  const highlighted = document.querySelectorAll(".mchighlight");
  highlighted.forEach(el => el.classList.remove("mchighlight"));
}

function highlightChoice(block, choiceKey) {
  if (!block || !choiceKey) return;
  
  const choice = block.choices.find(c => c.key === choiceKey);
  if (!choice) return;

  const elementToHighlight = choice.label || choice.radio;
  if (elementToHighlight) {
    elementToHighlight.classList.add("mchighlight");
  }
}

function askForHelp(blocks) {
  if (!blocks || !blocks.length) return;
  
  const payload = blocks.map((block) => ({
    id: block.id,
    question: block.questionText,
    choices: block.choices.map(c => c.text),
  }));

  chrome.runtime.sendMessage({ type: "ASK_AI", payload });
}

function applyAnswers(answers) {
  if (!answers || !answers.length) return;
  
  clearHighlights();

  answers.forEach((ans) => {
    const block = questionBlocks.find(b => b.id === ans.questionId);
    if (block) {
      highlightChoice(block, ans.answer);
    }
  });
}

function init() {
  injectStyles();
  questionBlocks = discoverQuestionBlocks();
  if (questionBlocks.length > 0) {
    askForHelp(questionBlocks);
  } else {
    console.log("MCQ Helper: No multiple choice questions found on this page.");
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "HIGHLIGHT_ANSWERS") {
    applyAnswers(message.payload);
  } else if (message?.type === "AI_ERROR") {
    console.error("MCQ Helper AI Error:", message.payload.message);
    // Maybe show an alert or a more visible notification on the page?
  }
});

// The script can be executed in two ways:
// 1. Automatically when the page loads (if configured in manifest.json)
// 2. On-demand when the user clicks the popup button.
// This checks ensures we don't re-run the logic if it's already been run.
if (typeof window.mcqHelperInitialized === 'undefined') {
  window.mcqHelperInitialized = true;
  init();
}
