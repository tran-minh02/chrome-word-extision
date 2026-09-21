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

// Bôi đen dịch tức thì (Tối đa 100 từ, khoảng hồi 2s)
let tooltip = null;
let lastTranslateTime = 0;
let translateTimer = null;

function removeTooltip() {
  clearTimeout(translateTimer);
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
}

document.addEventListener("mousedown", (e) => {
  if (tooltip && !tooltip.contains(e.target)) {
    removeTooltip();
  }
});

document.addEventListener("mouseup", (e) => {
  if (tooltip && tooltip.contains(e.target)) return;

  const selection = window.getSelection();
  const text = selection ? selection.toString().trim() : "";
  const words = text ? text.split(/\s+/).filter(Boolean) : [];

  if (words.length === 0 || words.length > 50 || /^[\d\s\W]+$/.test(text)) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return;

  removeTooltip();

  tooltip = document.createElement("div");
  tooltip.id = "evs-translate-tooltip";
  tooltip.style.cssText = `
    position: absolute;
    left: ${Math.max(10, rect.left + window.scrollX)}px;
    top: ${rect.bottom + window.scrollY + 6}px;
    z-index: 2147483647;
    background: #0f172a;
    color: #f8fafc;
    padding: 6px 12px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    line-height: 1.4;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    max-width: 400px;
    word-break: break-word;
    border: 1px solid rgba(255,255,255,0.1);
  `;
  tooltip.innerHTML = '<span style="color:#94a3b8;font-size:11px;">Đang dịch...</span>';
  document.body.appendChild(tooltip);

  if (!chrome.runtime?.id) {
    removeTooltip();
    return;
  }

  const now = Date.now();
  const waitMs = Math.max(0, 2000 - (now - lastTranslateTime));

  clearTimeout(translateTimer);
  translateTimer = setTimeout(() => {
    lastTranslateTime = Date.now();
    try {
      chrome.runtime.sendMessage({ action: "fetchDetails", word: text }, (res) => {
        if (chrome.runtime.lastError || !tooltip) {
          removeTooltip();
          return;
        }
        const meaning = res?.details?.vietnameseMeaning;
        const phonetic = res?.details?.phonetic ? ` <span style="color:#94a3b8;font-size:11px;">/${res.details.phonetic}/</span>` : "";
        if (meaning) {
          tooltip.innerHTML = words.length > 1
            ? `<div style="color:#94a3b8;font-size:11px;margin-bottom:3px;max-height:45px;overflow:hidden;text-overflow:ellipsis;">${text}</div><div style="font-weight:500;">${meaning}</div>`
            : `<strong style="color:#38bdf8;">${text}</strong>${phonetic}: ${meaning}`;
        } else {
          tooltip.innerHTML = '<span style="color:#f87171;font-size:11px;">Không tìm thấy nghĩa</span>';
          setTimeout(removeTooltip, 1500);
        }
      });
    } catch (_) {
      removeTooltip();
    }
  }, waitMs);
});




