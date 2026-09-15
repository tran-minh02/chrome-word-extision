// Popup Logic - English Vocabulary Saver

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const statTotal = document.getElementById('stat-total');
  const statLearning = document.getElementById('stat-learning');
  const statMastered = document.getElementById('stat-mastered');
  const recentCount = document.getElementById('recent-count');
  const recentList = document.getElementById('recent-list');
  const quickAddForm = document.getElementById('quick-add-form');
  const quickWordInput = document.getElementById('quick-word');
  const quickMeaningInput = document.getElementById('quick-meaning');
  const btnOpenDashboard = document.getElementById('btn-open-dashboard');
  const btnOpenDashboardTop = document.getElementById('btn-open-dashboard-top');

  // Load and render data
  await loadAndRender();

  // Handle open dashboard
  function openDashboard() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('dashboard/dashboard.html'));
    }
  }

  btnOpenDashboard.addEventListener('click', openDashboard);
  btnOpenDashboardTop.addEventListener('click', openDashboard);

  // Handle quick add form
  quickAddForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const word = quickWordInput.value.trim();
    const vietnameseMeaning = quickMeaningInput.value.trim();
    if (!word) return;

    const btnSubmit = quickAddForm.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.style.opacity = '0.7';

    try {
      // Tra cứu chi tiết online
      let details = null;
      try {
        const response = await chrome.runtime.sendMessage({ action: "fetchDetails", word });
        if (response && response.details) {
          details = response.details;
        }
      } catch (err) {
        console.warn("Lỗi gọi fetchDetails:", err);
      }

      // Lưu vào storage
      const storage = await chrome.storage.local.get(['vocabularies']);
      const vocabularies = storage.vocabularies || [];

      // Check duplicate
      const existingIdx = vocabularies.findIndex(v => v.word.toLowerCase() === word.toLowerCase());
      if (existingIdx !== -1) {
        if (vietnameseMeaning) {
          vocabularies[existingIdx].vietnameseMeaning = vietnameseMeaning;
        }
        vocabularies[existingIdx].lastReviewed = new Date().toISOString();
      } else {
        const newEntry = {
          id: "vocab_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
          word: word,
          phonetic: details?.phonetic || "",
          audioUrl: details?.audioUrl || "",
          partOfSpeech: details?.partOfSpeech || "",
          englishMeaning: details?.englishMeaning || "",
          vietnameseMeaning: vietnameseMeaning,
          contextSentence: details?.example ? `Example: ${details.example}` : "",
          sourceUrl: "",
          sourceTitle: "Thêm thủ công",
          dateAdded: new Date().toISOString(),
          status: "learning",
          tags: []
        };
        vocabularies.unshift(newEntry);
      }

      await chrome.storage.local.set({ vocabularies });
      chrome.runtime.sendMessage({ action: "updateBadge" });

      quickWordInput.value = '';
      quickMeaningInput.value = '';
      await loadAndRender();
    } catch (err) {
      console.error("Lỗi khi thêm từ:", err);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.style.opacity = '1';
    }
  });

  // Load and render function
  async function loadAndRender() {
    const storage = await chrome.storage.local.get(['vocabularies']);
    const list = storage.vocabularies || [];

    // Calculate stats
    const total = list.length;
    const learning = list.filter(item => item.status === 'learning').length;
    const mastered = list.filter(item => item.status === 'mastered').length;

    statTotal.textContent = total;
    statLearning.textContent = learning;
    statMastered.textContent = mastered;
    recentCount.textContent = list.slice(0, 4).length;

    // Render recent items
    const recents = list.slice(0, 4);
    if (recents.length === 0) {
      recentList.innerHTML = `
        <div class="empty-state">
          <p>Chưa có từ vựng nào. Hãy bôi đen từ trên web và click chuột phải để lưu!</p>
        </div>
      `;
      return;
    }

    recentList.innerHTML = recents.map(item => `
      <div class="recent-item" data-id="${item.id}">
        <div class="item-left">
          <div class="item-word-row">
            <span class="item-word">${escapeHtml(item.word)}</span>
            ${item.phonetic ? `<span class="item-phonetic">${escapeHtml(item.phonetic)}</span>` : ''}
          </div>
          <span class="item-meaning">${escapeHtml(item.vietnameseMeaning || item.englishMeaning || 'Chưa có nghĩa')}</span>
        </div>
        <div class="item-actions">
          <button class="item-btn btn-speak" title="Phát âm" data-word="${escapeHtml(item.word)}" data-audio="${escapeHtml(item.audioUrl || '')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
          <button class="item-btn btn-toggle-status" title="${item.status === 'mastered' ? 'Chuyển về Đang học' : 'Đánh dấu Đã thuộc'}" data-id="${item.id}" data-status="${item.status}">
            <svg viewBox="0 0 24 24" fill="none" stroke="${item.status === 'mastered' ? '#34d399' : '#94a3b8'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    // Attach speak listeners
    recentList.querySelectorAll('.btn-speak').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const word = btn.getAttribute('data-word');
        const audioUrl = btn.getAttribute('data-audio');
        playPronunciation(word, audioUrl);
      });
    });

    // Attach status toggle listeners
    recentList.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const currentStatus = btn.getAttribute('data-status');
        const newStatus = currentStatus === 'mastered' ? 'learning' : 'mastered';
        
        const storage = await chrome.storage.local.get(['vocabularies']);
        const list = storage.vocabularies || [];
        const item = list.find(x => x.id === id);
        if (item) {
          item.status = newStatus;
          await chrome.storage.local.set({ vocabularies: list });
          await loadAndRender();
        }
      });
    });
  }

  // Phát âm: ưu tiên audioUrl từ Dictionary API, fallback Web Speech API
  function playPronunciation(word, audioUrl) {
    if (audioUrl && audioUrl.startsWith('http')) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        fallbackWebSpeech(word);
      });
    } else {
      fallbackWebSpeech(word);
    }
  }

  function fallbackWebSpeech(word) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
