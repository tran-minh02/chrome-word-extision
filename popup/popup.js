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
    const originalBtnContent = btnSubmit.innerHTML;
    btnSubmit.disabled = true;

    try {
      // 1. Lưu vào storage ngay lập tức (0ms), không đợi mạng
      const storage = await chrome.storage.local.get(['vocabularies']);
      const vocabularies = storage.vocabularies || [];

      let entryId;
      const existingIdx = vocabularies.findIndex(v => v.word.toLowerCase() === word.toLowerCase());
      if (existingIdx !== -1) {
        if (vietnameseMeaning) {
          vocabularies[existingIdx].vietnameseMeaning = vietnameseMeaning;
        }
        vocabularies[existingIdx].lastReviewed = new Date().toISOString();
        entryId = vocabularies[existingIdx].id;
        // Đưa từ vừa cập nhật lên đầu danh sách để thấy ngay thay đổi
        const [moved] = vocabularies.splice(existingIdx, 1);
        vocabularies.unshift(moved);
      } else {
        entryId = "vocab_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
        const newEntry = {
          id: entryId,
          word: word,
          phonetic: "",
          audioUrl: "",
          partOfSpeech: "",
          englishMeaning: "",
          vietnameseMeaning: vietnameseMeaning,
          contextSentence: "",
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

      // Phản hồi trực quan trên nút
      btnSubmit.innerHTML = '<span>✓ Đã lưu!</span>';
      setTimeout(() => {
        btnSubmit.innerHTML = originalBtnContent;
        btnSubmit.disabled = false;
      }, 1000);

      // 2. Tra cứu chi tiết online ngầm (không chặn giao diện)
      chrome.runtime.sendMessage({ action: "fetchDetails", word }, async (response) => {
        if (response && response.details) {
          const curStorage = await chrome.storage.local.get(['vocabularies']);
          const list = curStorage.vocabularies || [];
          const idx = list.findIndex(v => v.id === entryId);
          if (idx !== -1) {
            list[idx].phonetic = response.details.phonetic || list[idx].phonetic;
            list[idx].audioUrl = response.details.audioUrl || list[idx].audioUrl;
            list[idx].partOfSpeech = response.details.partOfSpeech || list[idx].partOfSpeech;
            list[idx].englishMeaning = response.details.englishMeaning || list[idx].englishMeaning;
            if (!list[idx].contextSentence && response.details.example) {
              list[idx].contextSentence = `Example: ${response.details.example}`;
            }
            await chrome.storage.local.set({ vocabularies: list });
            await loadAndRender();
          }
        }
      });
    } catch (err) {
      console.error("Lỗi khi thêm từ:", err);
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnContent;
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
          <div class="item-meaning-wrap">
            <span class="item-meaning" data-id="${item.id}" title="Nhấp vào đây để thêm hoặc sửa nhanh nghĩa/ghi chú">${escapeHtml(item.vietnameseMeaning || item.englishMeaning || 'Chưa có nghĩa (Click để thêm)')}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="item-btn btn-edit-note" title="Sửa nhanh ghi chú" data-id="${item.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
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

    // Inline edit handler
    function startEditMeaning(id) {
      const itemEl = recentList.querySelector(`.recent-item[data-id="${id}"]`);
      if (!itemEl) return;
      const wrap = itemEl.querySelector('.item-meaning-wrap');
      if (!wrap || wrap.querySelector('input')) return;

      const targetItem = recents.find(x => x.id === id);
      const currentVal = targetItem?.vietnameseMeaning || '';

      wrap.innerHTML = `
        <div style="display:flex; gap:4px; align-items:center; width:100%; margin-top:2px;">
          <input type="text" class="quick-inline-input" value="${escapeHtml(currentVal)}" placeholder="Gõ nghĩa / ghi chú..." style="flex:1; font-size:11.5px; padding:2px 6px; background:#0b0f19; border:1px solid #6366f1; border-radius:4px; color:#fff; outline:none; height:24px;">
          <button type="button" class="quick-inline-save" title="Lưu" style="background:#6366f1; border:none; border-radius:3px; color:#fff; font-size:10px; padding:2px 6px; cursor:pointer; font-weight:600; height:24px;">Lưu</button>
        </div>
      `;

      const input = wrap.querySelector('.quick-inline-input');
      const saveBtn = wrap.querySelector('.quick-inline-save');
      input.focus();
      input.select();

      let isFinished = false;
      const saveNote = async () => {
        if (isFinished) return;
        isFinished = true;
        const newText = input.value.trim();
        const storage = await chrome.storage.local.get(['vocabularies']);
        const list = storage.vocabularies || [];
        const itemObj = list.find(x => x.id === id);
        if (itemObj) {
          itemObj.vietnameseMeaning = newText;
          itemObj.lastReviewed = new Date().toISOString();
          await chrome.storage.local.set({ vocabularies: list });
        }
        await loadAndRender();
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveNote();
        } else if (e.key === 'Escape') {
          isFinished = true;
          loadAndRender();
        }
      });

      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveNote();
      });
    }

    // Attach inline edit listeners
    recentList.querySelectorAll('.item-meaning').forEach(span => {
      span.addEventListener('click', (e) => {
        e.stopPropagation();
        startEditMeaning(span.getAttribute('data-id'));
      });
    });

    recentList.querySelectorAll('.btn-edit-note').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        startEditMeaning(btn.getAttribute('data-id'));
      });
    });

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
