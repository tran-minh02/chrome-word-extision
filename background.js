// English Vocabulary Saver - Background Service Worker (Manifest V3)

// 1. Khởi tạo Context Menu và Badge khi cài đặt hoặc khởi động
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-english-vocab",
    title: 'Lưu từ vựng: "%s"',
    contexts: ["selection"]
  });
  updateBadgeCount();
});

// Cập nhật số lượng từ hiển thị trên icon Extension
async function updateBadgeCount() {
  try {
    const data = await chrome.storage.local.get(['vocabularies']);
    const list = data.vocabularies || [];
    const count = list.length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
    chrome.action.setBadgeBackgroundColor({ color: "#4F46E5" });
  } catch (err) {
    console.error("Lỗi cập nhật badge:", err);
  }
}

// 2. Tra cứu thông tin từ vựng qua Free Dictionary API
async function fetchWordDetails(word) {
  const cleanWord = word.trim().toLowerCase();
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    let phonetic = entry.phonetic || '';
    let audioUrl = '';

    if (entry.phonetics && Array.isArray(entry.phonetics)) {
      for (const p of entry.phonetics) {
        if (!phonetic && p.text) phonetic = p.text;
        if (!audioUrl && p.audio) audioUrl = p.audio;
        if (phonetic && audioUrl) break;
      }
    }

    let englishMeaning = '';
    let partOfSpeech = '';
    let example = '';

    if (entry.meanings && entry.meanings.length > 0) {
      const firstMeaning = entry.meanings[0];
      partOfSpeech = firstMeaning.partOfSpeech || '';
      if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
        englishMeaning = firstMeaning.definitions[0].definition || '';
        example = firstMeaning.definitions[0].example || '';
      }
    }

    return {
      phonetic,
      audioUrl,
      englishMeaning,
      partOfSpeech,
      example
    };
  } catch (e) {
    console.warn("Không thể tra cứu online cho từ:", cleanWord, e);
    return null;
  }
}

// 3. Xử lý sự kiện click Chuột phải (Context Menu) - Tối ưu hóa siêu tốc (Instant Feedback)
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-english-vocab") {
    const selectedText = (info.selectionText || "").trim();
    if (!selectedText) return;

    // Lấy câu ngữ cảnh với timeout 100ms (tránh bị treo/chờ trên trang PDF hoặc trang đặc biệt)
    let contextSentence = selectedText;
    if (tab && tab.id) {
      try {
        const getContextPromise = chrome.tabs.sendMessage(tab.id, { action: "getContextSentence" })
          .then(res => res?.sentence?.trim() || selectedText)
          .catch(() => selectedText);

        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(selectedText), 120));
        contextSentence = await Promise.race([getContextPromise, timeoutPromise]);
      } catch (err) {
        contextSentence = selectedText;
      }
    }

    // Lấy dữ liệu lưu trữ hiện tại
    const storage = await chrome.storage.local.get(['vocabularies']);
    const vocabularies = storage.vocabularies || [];

    // Kiểm tra xem từ đã tồn tại chưa
    const existingIndex = vocabularies.findIndex(
      v => v.word.toLowerCase() === selectedText.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Từ đã tồn tại -> cập nhật lại câu ngữ cảnh và ngày xem
      vocabularies[existingIndex].contextSentence = contextSentence || vocabularies[existingIndex].contextSentence;
      vocabularies[existingIndex].lastReviewed = new Date().toISOString();
      await chrome.storage.local.set({ vocabularies });

      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "Từ vựng đã có trong danh sách!",
        message: `Từ "${selectedText}" đã được cập nhật lại ngữ cảnh.`,
        priority: 1
      });
      return;
    }

    // TẠO VÀ LƯU NGAY LẬP TỨC (Không chờ API mạng - phản hồi 0ms)
    const newEntryId = "vocab_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    const newEntry = {
      id: newEntryId,
      word: selectedText,
      phonetic: "",
      audioUrl: "",
      partOfSpeech: "",
      englishMeaning: "",
      vietnameseMeaning: "",
      contextSentence: contextSentence || selectedText,
      sourceUrl: tab?.url || "",
      sourceTitle: tab?.title || (tab?.url?.endsWith('.pdf') ? "Tài liệu PDF" : "Web page"),
      dateAdded: new Date().toISOString(),
      status: "learning",
      tags: []
    };

    vocabularies.unshift(newEntry);
    await chrome.storage.local.set({ vocabularies });
    updateBadgeCount();

    // Hiển thị thông báo ngay lập tức cho người dùng
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Đã lưu từ vựng!",
      message: `Đã thêm "${selectedText}" vào danh sách từ vựng.`,
      priority: 1
    });

    // CHẠY NGẦM: Tự động bổ sung phiên âm & audio từ từ điển online sau khi đã lưu
    fetchWordDetails(selectedText).then(async (details) => {
      if (!details) return;
      const currentStorage = await chrome.storage.local.get(['vocabularies']);
      const currentList = currentStorage.vocabularies || [];
      const itemIndex = currentList.findIndex(v => v.id === newEntryId);
      if (itemIndex !== -1) {
        currentList[itemIndex].phonetic = details.phonetic || currentList[itemIndex].phonetic;
        currentList[itemIndex].audioUrl = details.audioUrl || currentList[itemIndex].audioUrl;
        currentList[itemIndex].partOfSpeech = details.partOfSpeech || currentList[itemIndex].partOfSpeech;
        currentList[itemIndex].englishMeaning = details.englishMeaning || currentList[itemIndex].englishMeaning;
        if (!currentList[itemIndex].contextSentence || currentList[itemIndex].contextSentence === selectedText) {
          if (details.example) currentList[itemIndex].contextSentence = `Example: ${details.example}`;
        }
        await chrome.storage.local.set({ vocabularies: currentList });
      }
    }).catch(err => console.warn("Lỗi background fetch details:", err));
  }
});

// Lắng nghe messages từ Popup hoặc Dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateBadge") {
    updateBadgeCount();
    sendResponse({ success: true });
  } else if (request.action === "fetchDetails") {
    fetchWordDetails(request.word)
      .then(details => sendResponse({ details }))
      .catch(() => sendResponse({ details: null }));
    return true; // async response
  } else if (request.action === "openDashboard") {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
  }
});
