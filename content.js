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
