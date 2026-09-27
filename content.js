// English Vocabulary Saver - Content Script

// Lắng nghe yêu cầu lấy câu ngữ cảnh từ background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getContextSentence") {
    const context = extractContextSentence();
    sendResponse(context);
  }
});

// Hàm trích xuất câu văn ngữ cảnh bao quanh từ bôi đen
function extractContextSentence() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { sentence: "", pageTitle: document.title, pageUrl: window.location.href };
  }

  const selectedText = selection.toString().trim();
  if (!selectedText) {
    return { sentence: "", pageTitle: document.title, pageUrl: window.location.href };
  }

  const range = selection.getRangeAt(0);
  let container = range.commonAncestorContainer;

  // Nếu là Text node thì lấy element cha
  if (container.nodeType === Node.TEXT_NODE) {
    container = container.parentElement;
  }

  // Tìm block text gần nhất (p, li, h1-h6, div, article, section)
  let blockEl = container;
  while (blockEl && !['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'ARTICLE', 'SECTION', 'BLOCKQUOTE', 'TD', 'SPAN', 'DIV'].includes(blockEl.tagName)) {
    if (blockEl.parentElement) {
      blockEl = blockEl.parentElement;
    } else {
      break;
    }
  }

  const fullText = (blockEl ? blockEl.innerText || blockEl.textContent : container.textContent) || "";
  
  // Tách đoạn văn thành các câu dựa theo dấu kết thúc câu (. ! ? \n)
  const sentences = fullText.split(/(?<=[.!?\n])\s+/);
  
  // Tìm câu chứa cụm từ đang được bôi đen
  let matchedSentence = sentences.find(s => s.toLowerCase().includes(selectedText.toLowerCase()));

  if (!matchedSentence) {
    matchedSentence = fullText.length > 300 ? fullText.substring(0, 300) + '...' : fullText;
  }

  return {
    sentence: matchedSentence ? matchedSentence.trim() : selectedText,
    pageTitle: document.title,
    pageUrl: window.location.href
  };
}

// ==========================================
// ĐỒNG BỘ: BÔI ĐEN DỊCH TỨC THÌ TRÊN WEB (MATCHING PDF READER)
// ==========================================
let tooltipHost = null;
let currentWordDetails = null;
let currentSelectedText = "";
let currentContextSentence = "";

function removeTooltip() {
  if (tooltipHost) {
    tooltipHost.remove();
    tooltipHost = null;
    currentWordDetails = null;
    currentSelectedText = "";
  }
}

document.addEventListener("mousedown", (e) => {
  if (tooltipHost && !tooltipHost.contains(e.target)) {
    removeTooltip();
  }
});

document.addEventListener("mouseup", (e) => {
  if (tooltipHost && tooltipHost.contains(e.target)) return;

  setTimeout(async () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    if (!text || text.length > 250 || /^[\d\s\W]+$/.test(text)) return;

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 50) return;

    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return;

    const contextObj = extractContextSentence();
    currentContextSentence = contextObj?.sentence || text;
    currentSelectedText = text;

    showWebTooltip(text, rect);
    fetchWebTranslation(text);
  }, 20);
});

function showWebTooltip(text, rect) {
  removeTooltip();

  tooltipHost = document.createElement("div");
  tooltipHost.id = "evs-translate-host";
  
  // Shadow DOM to isolate styles from target webpage
  const shadow = tooltipHost.attachShadow({ mode: "open" });

  const tooltipWidth = 320;
  let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
  left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, left));

  let top = rect.bottom + 8;
  if (top + 220 > window.innerHeight) {
    top = Math.max(10, rect.top - 200);
  }

  const style = document.createElement("style");
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .evs-tooltip-card {
      position: fixed;
      left: ${left}px;
      top: ${top}px;
      z-index: 2147483647;
      width: ${tooltipWidth}px;
      background: rgba(15, 23, 42, 0.96);
      border: 1px solid rgba(99, 102, 241, 0.4);
      border-radius: 10px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      animation: evsFadeIn 0.15s ease-out;
      color: #f8fafc;
      user-select: text;
      text-align: left;
    }
    @keyframes evsFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .tooltip-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 6px;
    }
    .tooltip-word-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      overflow: hidden;
    }
    .tooltip-word {
      font-weight: 700;
      font-size: 14px;
      color: #38bdf8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tooltip-phonetic {
      font-size: 11px;
      color: #a5b4fc;
    }
    .tooltip-btn-icon {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s;
    }
    .tooltip-btn-icon:hover {
      color: #fff;
    }
    .tooltip-btn-icon svg {
      width: 14px;
      height: 14px;
    }
    .tooltip-btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 14px;
      padding: 0 4px;
      line-height: 1;
    }
    .tooltip-btn-close:hover {
      color: #fff;
    }
    .tooltip-body {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .tooltip-meaning {
      font-size: 13.5px;
      font-weight: 600;
      color: #fff;
      line-height: 1.4;
      word-break: break-word;
    }
    .tooltip-en {
      font-size: 11.5px;
      color: #cbd5e1;
      font-style: italic;
      line-height: 1.35;
      border-left: 2px solid #6366f1;
      padding-left: 6px;
      display: none;
    }
    .tooltip-context {
      font-size: 11px;
      color: #94a3b8;
      background: rgba(0, 0, 0, 0.25);
      padding: 4px 6px;
      border-radius: 4px;
      max-height: 48px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: none;
    }
    .tooltip-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;
    }
    .btn-tooltip-save {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
    }
    .btn-tooltip-save:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }
    .btn-tooltip-save svg {
      width: 13px;
      height: 13px;
    }
    .btn-tooltip-save.saved {
      background: #10b981;
      cursor: default;
    }
  `;

  const card = document.createElement("div");
  card.className = "evs-tooltip-card";
  card.innerHTML = `
    <div class="tooltip-header">
      <div class="tooltip-word-row">
        <span class="tooltip-word">${escapeHtml(text)}</span>
        <span class="tooltip-phonetic"></span>
        <button class="tooltip-btn-icon btn-speak" title="Phát âm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>
      </div>
      <button class="tooltip-btn-close" title="Đóng">✕</button>
    </div>
    <div class="tooltip-body">
      <div class="tooltip-meaning">Đang tra cứu từ điển...</div>
      <div class="tooltip-en"></div>
      <div class="tooltip-context"></div>
    </div>
    <div class="tooltip-footer">
      <button class="btn-tooltip-save">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>Lưu vào sổ từ</span>
      </button>
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(card);

  // Close button
  card.querySelector(".tooltip-btn-close").addEventListener("click", removeTooltip);

  // Speak button
  card.querySelector(".btn-speak").addEventListener("click", () => {
    if (currentWordDetails?.audioUrl && currentWordDetails.audioUrl.startsWith("http")) {
      const audio = new Audio(currentWordDetails.audioUrl);
      audio.play().catch(() => speakWebSpeech(currentSelectedText));
    } else {
      speakWebSpeech(currentSelectedText);
    }
  });

  // Save button
  const saveBtn = card.querySelector(".btn-tooltip-save");
  saveBtn.addEventListener("click", async () => {
    if (!currentSelectedText) return;

    try {
      const storage = await chrome.storage.local.get(["vocabularies"]);
      const vocabularies = storage.vocabularies || [];

      const now = new Date().toISOString();
      const entryId = "vocab_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
      const existingIdx = vocabularies.findIndex(v => v.word.toLowerCase() === currentSelectedText.toLowerCase());

      const meaningText = shadow.querySelector(".tooltip-meaning")?.textContent || "";
      const itemData = {
        id: existingIdx !== -1 ? vocabularies[existingIdx].id : entryId,
        word: currentSelectedText,
        phonetic: currentWordDetails?.phonetic || "",
        audioUrl: currentWordDetails?.audioUrl || "",
        partOfSpeech: currentWordDetails?.partOfSpeech || "",
        englishMeaning: currentWordDetails?.englishMeaning || "",
        vietnameseMeaning: currentWordDetails?.vietnameseMeaning || meaningText,
        contextSentence: currentContextSentence || currentSelectedText,
        sourceUrl: window.location.href,
        sourceTitle: document.title || "Web page",
        dateAdded: existingIdx !== -1 ? vocabularies[existingIdx].dateAdded : now,
        updatedAt: now,
        status: "learning",
        tags: []
      };

      if (existingIdx !== -1) {
        vocabularies[existingIdx] = { ...vocabularies[existingIdx], ...itemData };
        const [moved] = vocabularies.splice(existingIdx, 1);
        vocabularies.unshift(moved);
      } else {
        vocabularies.unshift(itemData);
      }

      await chrome.storage.local.set({ vocabularies });

      if (chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ action: "updateBadge" }).catch(() => {});
      }

      saveBtn.classList.add("saved");
      saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Đã lưu vào sổ!</span>
      `;
    } catch (err) {
      console.error("Lỗi lưu từ vựng:", err);
    }
  });

  const container = document.body || document.documentElement;
  if (container) {
    container.appendChild(tooltipHost);
  }
}

function fetchWebTranslation(word) {
  try {
    chrome.runtime.sendMessage({ action: "fetchDetails", word }, (response) => {
      if (!tooltipHost) return;
      const shadow = tooltipHost.shadowRoot;
      if (!shadow) return;

      if (!response || !response.details) {
        fallbackWebGoogleTranslate(word);
        return;
      }

      const details = response.details;
      currentWordDetails = details;

      const phoneticEl = shadow.querySelector(".tooltip-phonetic");
      const meaningEl = shadow.querySelector(".tooltip-meaning");
      const enEl = shadow.querySelector(".tooltip-en");
      const contextEl = shadow.querySelector(".tooltip-context");

      if (details.phonetic && phoneticEl) {
        phoneticEl.textContent = `/${details.phonetic}/`;
      }

      if (details.vietnameseMeaning && meaningEl) {
        meaningEl.textContent = details.vietnameseMeaning;
      } else if (meaningEl) {
        meaningEl.textContent = "Chưa có bản dịch tiếng Việt";
      }

      if (details.englishMeaning && enEl) {
        enEl.textContent = details.englishMeaning;
        enEl.style.display = "block";
      }

      if (details.example && contextEl) {
        contextEl.textContent = `Example: ${details.example}`;
        contextEl.style.display = "block";
      } else if (currentContextSentence && currentContextSentence !== word && contextEl) {
        contextEl.textContent = currentContextSentence;
        contextEl.style.display = "block";
      }
    });
  } catch (_) {
    fallbackWebGoogleTranslate(word);
  }
}

async function fallbackWebGoogleTranslate(word) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(word)}`;
    const res = await fetch(url);
    if (res.ok && tooltipHost) {
      const shadow = tooltipHost.shadowRoot;
      const data = await res.json();
      const meaning = data[0]?.map(x => x[0]).join("") || "";
      const meaningEl = shadow?.querySelector(".tooltip-meaning");
      if (meaningEl) meaningEl.textContent = meaning || "Không tìm thấy nghĩa";
      currentWordDetails = { vietnameseMeaning: meaning, audioUrl: "" };
    }
  } catch (e) {
    if (tooltipHost) {
      const shadow = tooltipHost.shadowRoot;
      const meaningEl = shadow?.querySelector(".tooltip-meaning");
      if (meaningEl) meaningEl.textContent = "Lỗi kết nối tra từ điển";
    }
  }
}

function speakWebSpeech(text) {
  if ("speechSynthesis" in window && text) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}




