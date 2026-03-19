// content.js
// Enhanced detector for multiple choice questions

(function() {
  const HIGHLIGHT_CSS = `
  .mchighlight { 
    background-color: rgba(255, 255, 0, 0.4) !important; 
    border: 2px solid #ffd700 !important;
    border-radius: 4px; 
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.5); 
    transition: all 0.3s ease;
  }
  `;

  function injectStyles() {
    if (document.getElementById("mchighlight-style")) return;
    const style = document.createElement("style");
    style.id = "mchighlight-style";
    style.textContent = HIGHLIGHT_CSS + `
      @keyframes mcq-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      .mcq-spinner { border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid #00C974; border-radius: 50%; width: 18px; height: 18px; animation: mcq-spin 1s linear infinite; }
    `;
    document.head.appendChild(style);
  }

  function showLoadingIndicator(messageText = "MCQ Helper está processando...") {
    hideLoadingIndicator();
    const div = document.createElement("div");
    div.id = "mcq-loading-indicator";
    div.innerHTML = `
      <div style="background: #1e1e2e; color: #cdd6f4; border: 1px solid #45475a; padding: 12px 20px; border-radius: 12px; 
                  display: flex; align-items: center; gap: 12px; font-family: system-ui, sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.5); font-size: 14px;">
        <div class="mcq-spinner"></div>
        <span>${messageText}</span>
      </div>
    `;
    div.style.position = "fixed";
    div.style.bottom = "30px";
    div.style.right = "30px";
    div.style.zIndex = "2147483647"; // Max value
    document.body.appendChild(div);
  }
  
  function hideLoadingIndicator() {
    document.getElementById("mcq-loading-indicator")?.remove();
  }

  function showAIServerResponse(response) {
     hideLoadingIndicator();
     
     const selection = window.getSelection();
     let top = '50%';
     let left = '50%';
     
     if (selection.rangeCount > 0) {
       const rect = selection.getRangeAt(0).getBoundingClientRect();
       top = (rect.bottom + window.scrollY + 10) + 'px';
       left = (rect.left + window.scrollX) + 'px';
     }

     const overlay = document.createElement("div");
     overlay.id = "mcq-ai-overlay";
     overlay.innerHTML = `
       <div id="mcq-ai-window" style="background: rgba(28, 28, 30, 0.95); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.1); 
                   backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                   width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                   box-shadow: 0 20px 40px rgba(0,0,0,0.4); border-radius: 14px; overflow: hidden; position: absolute;">
         <div id="mcq-drag-handle" style="padding: 12px 16px; background: rgba(255,255,255,0.05); cursor: move; 
                      display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
           <span style="font-weight: 600; font-size: 13px; color: #00C974;">AI Analysis</span>
           <div style="display: flex; gap: 6px;">
             <div style="width: 12px; height: 12px; background: #FF5F57; border-radius: 50%; cursor: pointer;" onclick="document.getElementById('mcq-ai-overlay').remove()"></div>
           </div>
         </div>
         <div style="padding: 16px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; max-height: 400px; overflow-y: auto; color: #EBEBF5;">${response}</div>
         <div style="padding: 12px 16px; background: rgba(0,0,0,0.2); text-align: right;">
           <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                   style="padding: 6px 16px; background: #00C974; border: none; border-radius: 8px; color: #000; font-weight: 600; cursor: pointer; font-size: 13px;">Fechar</button>
         </div>
       </div>
     `;
     overlay.style.position = "absolute";
     overlay.style.top = top;
     overlay.style.left = left;
     overlay.style.zIndex = "2147483647";
     document.body.appendChild(overlay);

     const win = document.getElementById("mcq-ai-window");
     
     // Position check: don't overflow bottom
     const winRect = win.getBoundingClientRect();
     if (winRect.bottom > window.innerHeight) {
        overlay.style.top = (window.innerHeight + window.scrollY - winRect.height - 20) + 'px';
     }
     // Don't overflow right
     if (winRect.right > window.innerWidth) {
        overlay.style.left = (window.innerWidth + window.scrollX - winRect.width - 20) + 'px';
     }

     // Drag logic
     const handle = document.getElementById("mcq-drag-handle");
     let isDragging = false;
     let offset = { x: 0, y: 0 };

     handle.addEventListener("mousedown", (e) => {
       isDragging = true;
       offset.x = e.clientX - overlay.offsetLeft;
       offset.y = e.clientY - overlay.offsetTop;
     });

     document.addEventListener("mousemove", (e) => {
       if (!isDragging) return;
       overlay.style.left = (e.clientX - offset.x) + "px";
       overlay.style.top = (e.clientY - offset.y) + "px";
     });

     document.addEventListener("mouseup", () => {
       isDragging = false;
     });
  }

  function discoverHeuristicBlocks() {
    const blocks = [];
    const choiceMarkerRegex = /^[\s\n]*[\(\[]?([a-e1-5])[ \)\.\]](.*)/i;
    
    // 1. Look for ordered lists
    const ols = Array.from(document.querySelectorAll("ol"));
    ols.forEach(ol => {
      const lis = Array.from(ol.querySelectorAll(":scope > li"));
      if (lis.length >= 2 && lis.length <= 6) {
        const choices = lis.map((li, idx) => {
          const text = li.innerText.trim();
          const match = text.match(choiceMarkerRegex);
          return {
            key: match ? match[1].toUpperCase() : String.fromCharCode(65 + idx),
            element: li,
            text: match ? match[2].trim() : text
          };
        });

        let questionText = "";
        let prev = ol.previousElementSibling;
        let depth = 0;
        while (prev && depth < 3 && !questionText) {
          questionText = prev.innerText.trim();
          prev = prev.previousElementSibling;
          depth++;
        }
        
        if (!questionText || questionText.length < 10) {
          const parent = ol.parentElement;
          if (parent && parent.innerText.length > ol.innerText.length) {
            questionText = parent.innerText.replace(ol.innerText, "").trim().split('\n')[0];
          }
        }

        if (questionText && questionText.length > 5) {
          blocks.push({
            id: 'h_' + Math.random().toString(36).substr(2, 9),
            container: ol,
            questionText: questionText.substring(0, 500),
            choices,
            type: 'heuristic_ol'
          });
        }
      }
    });

    // 2. Look for groups of elements that look like choices
    const allElements = Array.from(document.querySelectorAll("div, p, span"));
    const choiceElements = allElements.filter(el => {
      if (el.children.length > 2) return false;
      return choiceMarkerRegex.test(el.innerText.trim());
    });

    const groups = new Map();
    choiceElements.forEach(el => {
      const parent = el.parentElement;
      if (!parent) return;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });

    groups.forEach((elements, parent) => {
      if (elements.length >= 2 && elements.length <= 6) {
        const choices = elements.map((el, idx) => {
          const text = el.innerText.trim();
          const match = text.match(choiceMarkerRegex);
          return {
            key: match[1].toUpperCase(),
            element: el,
            text: match[2].trim()
          };
        });

        let questionText = parent.previousElementSibling ? parent.previousElementSibling.innerText.trim() : "";
        if (!questionText || questionText.length < 10) {
            questionText = parent.innerText.split('\n')[0].trim();
        }

        blocks.push({
          id: 'h_' + Math.random().toString(36).substr(2, 9),
          container: parent,
          questionText: questionText.substring(0, 500),
          choices,
          type: 'heuristic_marker'
        });
      }
    });

    return blocks;
  }

  function discoverStandardBlocks() {
    const radios = Array.from(document.querySelectorAll("input[type=radio]"));
    if (!radios.length) return [];

    const groups = new Map();
    radios.forEach((radio) => {
      const name = radio.name || radio.id || radio.form?.id || "__anonymous__";
      if (!name) return;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(radio);
    });

    const blocks = [];
    groups.forEach((group, name) => {
      const container = group[0].closest("form") || group[0].closest("fieldset") || group[0].parentElement?.parentElement || document.body;
      const choices = group.map((radio, idx) => {
        const label = document.querySelector(`label[for="${radio.id}"]`) || radio.closest("label");
        const text = label ? label.innerText.trim() : (radio.value || `Choice ${idx + 1}`);
        return {
          key: String.fromCharCode(65 + idx),
          element: label || radio,
          text,
        };
      });

      const questionText = (container.innerText || "").split('\n')[0].trim();
      blocks.push({
        id: 's_' + name,
        container,
        questionText,
        choices,
        type: 'standard'
      });
    });

    return blocks;
  }

  function discoverQuestionBlocks() {
    const standard = discoverStandardBlocks();
    const heuristic = discoverHeuristicBlocks();
    
    const uniqueBlocks = [...standard];
    heuristic.forEach(hBlock => {
      const isDuplicate = uniqueBlocks.some(sBlock => 
        sBlock.container.contains(hBlock.container) || hBlock.container.contains(sBlock.container)
      );
      if (!isDuplicate) {
        uniqueBlocks.push(hBlock);
      }
    });

    return uniqueBlocks;
  }

  function clearHighlights() {
    const highlighted = document.querySelectorAll(".mchighlight");
    highlighted.forEach(el => el.classList.remove("mchighlight"));
  }

  function highlightChoice(block, choiceKey) {
    if (!block || !choiceKey) return;
    
    const choice = block.choices.find(c => c.key === choiceKey);
    if (!choice) return;

    if (choice.element) {
      choice.element.classList.add("mchighlight");
      choice.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function askForHelp(blocks) {
    if (!blocks || !blocks.length) return;
    
    showLoadingIndicator();
    const payload = blocks.map((block, idx) => ({
      id: idx,
      questionId: block.id,
      question: block.questionText,
      choices: block.choices.map(c => c.text),
    }));

    chrome.runtime.sendMessage({ type: "ASK_AI", payload });
  }

  function applyAnswers(answers) {
    hideLoadingIndicator();
    if (!answers || !answers.length) return;
    
    clearHighlights();

    answers.forEach((ans) => {
      const block = window.mcqHelperBlocks?.find(b => b.id === ans.questionId) || 
                    window.mcqHelperBlocks?.[ans.id];
      if (block) {
        highlightChoice(block, ans.answer);
      }
    });
  }

  function init() {
    injectStyles();
    const blocks = discoverQuestionBlocks();
    window.mcqHelperBlocks = blocks; // Store in window to survive re-injection if needed
    
    if (blocks.length > 0) {
      console.log(`MCQ Helper: Found ${blocks.length} questions.`, blocks);
      askForHelp(blocks);
    } else {
      console.log("MCQ Helper: No multiple choice questions found on this page.");
    }
  }

  // Handle message listener deduplication
  if (!window.mcqHelperMessageListener) {
    window.mcqHelperMessageListener = (message) => {
      if (message?.type === "HIGHLIGHT_ANSWERS") {
        applyAnswers(message.payload);
      } else if (message?.type === "AI_ERROR") {
        hideLoadingIndicator();
        console.error("MCQ Helper AI Error:", message.payload.message);
      } else if (message?.type === "SHOW_RESPONSE") {
        showAIServerResponse(message.payload);
      } else if (message?.type === "SHOW_LOADING") {
        showLoadingIndicator(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(window.mcqHelperMessageListener);
  }

  init();
})();
