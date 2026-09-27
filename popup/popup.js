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
  const btnToggleEnDetail = document.getElementById('btn-toggle-en-detail');

  // Load user preference for showing English detail
  let showEnDetail = true;
  const pref = await chrome.storage.local.get(['showEnDetail']);
  if (pref.showEnDetail !== undefined) {
    showEnDetail = pref.showEnDetail;
  }
  if (btnToggleEnDetail) {
    btnToggleEnDetail.classList.toggle('active', showEnDetail);
    btnToggleEnDetail.addEventListener('click', async () => {
      showEnDetail = !showEnDetail;
      btnToggleEnDetail.classList.toggle('active', showEnDetail);
      await chrome.storage.local.set({ showEnDetail });
      await loadAndRender();
    });
  }

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

  if (btnOpenDashboard) btnOpenDashboard.addEventListener('click', openDashboard);
  if (btnOpenDashboardTop) btnOpenDashboardTop.addEventListener('click', openDashboard);

  // Quick Search Elements
  const btnQuickSearch = document.getElementById('btn-quick-search');
  const quickSearchSection = document.getElementById('quick-search-section');
  const searchResWord = document.getElementById('search-res-word');
  const searchResPhonetic = document.getElementById('search-res-phonetic');
  const searchResPos = document.getElementById('search-res-pos');
  const searchResAudio = document.getElementById('search-res-audio');
  const searchResLoading = document.getElementById('search-res-loading');
  const searchResBody = document.getElementById('search-res-body');
  const searchResVi = document.getElementById('search-res-vi');
  const searchResEnWrap = document.getElementById('search-res-en-wrap');
  const searchResEn = document.getElementById('search-res-en');
  const searchResExample = document.getElementById('search-res-example');
  const searchResFooter = document.getElementById('search-res-footer');
  const btnCloseSearch = document.getElementById('btn-close-search');
  const btnSaveSearchedWord = document.getElementById('btn-save-searched-word');

  let currentSearchedData = null;

  function closeSearchResult() {
    if (quickSearchSection) {
      quickSearchSection.style.display = 'none';
    }
    currentSearchedData = null;
  }

  if (btnCloseSearch) {
    btnCloseSearch.addEventListener('click', closeSearchResult);
  }

  // Xử lý tra cứu nhanh (chỉ xem, không lưu vào storage)
  async function performQuickSearch() {
    const word = quickWordInput.value.trim();
    if (!word) {
      quickWordInput.focus();
      return;
    }

    // Hiển thị khung kết quả & loading
    quickSearchSection.style.display = 'flex';
    searchResWord.textContent = word;
    searchResPhonetic.style.display = 'none';
    searchResPos.style.display = 'none';
    searchResAudio.style.display = 'none';
    searchResLoading.style.display = 'flex';
    searchResBody.style.display = 'none';
    searchResFooter.style.display = 'none';

    const originalBtnContent = btnQuickSearch.innerHTML;
    btnQuickSearch.disabled = true;
    btnQuickSearch.innerHTML = `
      <span class="search-spinner" style="width:12px;height:12px;border-width:2px;"></span>
      <span>Tra...</span>
    `;

    try {
      chrome.runtime.sendMessage({ action: "fetchDetails", word }, (response) => {
        btnQuickSearch.disabled = false;
        btnQuickSearch.innerHTML = originalBtnContent;

        const details = response?.details;
        searchResLoading.style.display = 'none';
        searchResBody.style.display = 'flex';

        if (details && (details.vietnameseMeaning || details.englishMeaning || details.phonetic)) {
          currentSearchedData = { word, details };
          searchResWord.textContent = word;

          if (details.phonetic) {
            searchResPhonetic.textContent = details.phonetic;
            searchResPhonetic.style.display = 'inline';
          } else {
            searchResPhonetic.style.display = 'none';
          }

          if (details.partOfSpeech) {
            searchResPos.textContent = details.partOfSpeech;
            searchResPos.style.display = 'inline-block';
          } else {
            searchResPos.style.display = 'none';
          }

          if (details.audioUrl) {
            searchResAudio.style.display = 'inline-flex';
            searchResAudio.onclick = (e) => {
              e.stopPropagation();
              playPronunciation(word, details.audioUrl);
            };
          } else {
            searchResAudio.style.display = 'none';
          }

          searchResVi.textContent = details.vietnameseMeaning || '(Không có nghĩa tiếng Việt)';

          if (details.englishMeaning) {
            searchResEnWrap.style.display = 'flex';
            searchResEn.textContent = details.englishMeaning;
          } else {
            searchResEnWrap.style.display = 'none';
          }

          if (details.example) {
            searchResExample.style.display = 'block';
            searchResExample.textContent = `Ví dụ: ${details.example}`;
          } else {
            searchResExample.style.display = 'none';
          }

          searchResFooter.style.display = 'flex';
          btnSaveSearchedWord.disabled = false;
          btnSaveSearchedWord.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Lưu từ này</span>
          `;
        } else {
          currentSearchedData = null;
          searchResVi.textContent = 'Không tìm thấy định nghĩa cho từ này hoặc mất kết nối.';
          searchResEnWrap.style.display = 'none';
          searchResExample.style.display = 'none';
          searchResFooter.style.display = 'none';
        }

        quickSearchSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    } catch (err) {
      console.error("Lỗi khi tra cứu:", err);
      btnQuickSearch.disabled = false;
      btnQuickSearch.innerHTML = originalBtnContent;
      searchResLoading.style.display = 'none';
      searchResBody.style.display = 'flex';
      searchResVi.textContent = 'Có lỗi xảy ra khi gọi API tra cứu.';
      searchResFooter.style.display = 'none';
    }
  }

  if (btnQuickSearch) {
    btnQuickSearch.addEventListener('click', performQuickSearch);
  }

  // Hỗ trợ Shift+Enter hoặc Ctrl+Enter để tra cứu nhanh bằng bàn phím
  if (quickWordInput) {
    quickWordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey)) {
        e.preventDefault();
        performQuickSearch();
      }
    });
  }

  // Xử lý lưu từ ngay từ khung kết quả tra cứu (nếu sau khi tra muốn lưu lại)
  if (btnSaveSearchedWord) {
    btnSaveSearchedWord.addEventListener('click', async () => {
      if (!currentSearchedData) return;
      const { word, details } = currentSearchedData;
      btnSaveSearchedWord.disabled = true;

      try {
        const storage = await chrome.storage.local.get(['vocabularies']);
        const vocabularies = storage.vocabularies || [];
        const now = new Date().toISOString();
        const existingIdx = vocabularies.findIndex(v => v.word.toLowerCase() === word.toLowerCase());

        let entryId;
        if (existingIdx !== -1) {
          vocabularies[existingIdx].status = 'learning';
          vocabularies[existingIdx].lastReviewed = now;
          vocabularies[existingIdx].updatedAt = now;
          if (details.vietnameseMeaning && !vocabularies[existingIdx].vietnameseMeaning) {
            vocabularies[existingIdx].vietnameseMeaning = details.vietnameseMeaning;
          }
          if (details.phonetic) vocabularies[existingIdx].phonetic = details.phonetic;
          if (details.audioUrl) vocabularies[existingIdx].audioUrl = details.audioUrl;
          if (details.partOfSpeech) vocabularies[existingIdx].partOfSpeech = details.partOfSpeech;
          if (details.englishMeaning) vocabularies[existingIdx].englishMeaning = details.englishMeaning;
          if (details.example && !vocabularies[existingIdx].contextSentence) {
            vocabularies[existingIdx].contextSentence = `Example: ${details.example}`;
          }
          entryId = vocabularies[existingIdx].id;
          const [moved] = vocabularies.splice(existingIdx, 1);
          vocabularies.unshift(moved);
        } else {
          entryId = "vocab_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
          const newEntry = {
            id: entryId,
            word: word,
            phonetic: details.phonetic || "",
            audioUrl: details.audioUrl || "",
            partOfSpeech: details.partOfSpeech || "",
            englishMeaning: details.englishMeaning || "",
            vietnameseMeaning: details.vietnameseMeaning || "",
            contextSentence: details.example ? `Example: ${details.example}` : "",
            sourceUrl: "",
            sourceTitle: "Thêm từ popup (tra cứu)",
            dateAdded: now,
            updatedAt: now,
            status: "learning",
            tags: []
          };
          vocabularies.unshift(newEntry);
        }

        await chrome.storage.local.set({ vocabularies });
        if (chrome.runtime?.id && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: "updateBadge" }).catch(() => {});
        }

        await loadAndRender();

        btnSaveSearchedWord.innerHTML = '<span>✓ Đã lưu!</span>';
        setTimeout(() => {
          closeSearchResult();
          quickWordInput.value = '';
        }, 800);
      } catch (err) {
        console.error("Lỗi khi lưu từ đã tra cứu:", err);
        btnSaveSearchedWord.disabled = false;
      }
    });
  }

  // Handle quick add form (1 dòng, áp dụng như 1 từ được save)
  quickAddForm.addEventListener('submit', async (e) => {
    closeSearchResult();
    e.preventDefault();
    const word = quickWordInput.value.trim();
    if (!word) return;

    const words = word.split(/\s+/).filter(Boolean);
    if (words.length > 50) {
      alert("Chỉ cho phép thêm tối đa 50 từ.");
      return;
    }

    const btnSubmit = quickAddForm.querySelector('button[type="submit"]');
    const originalBtnContent = btnSubmit.innerHTML;
    btnSubmit.disabled = true;

    try {
      // 1. Lưu vào storage ngay lập tức (0ms) ở trạng thái learning
      const storage = await chrome.storage.local.get(['vocabularies']);
      const vocabularies = storage.vocabularies || [];

      let entryId;
      const now = new Date().toISOString();
      const existingIdx = vocabularies.findIndex(v => v.word.toLowerCase() === word.toLowerCase());
      if (existingIdx !== -1) {
        vocabularies[existingIdx].status = 'learning';
        vocabularies[existingIdx].lastReviewed = now;
        vocabularies[existingIdx].updatedAt = now;
        entryId = vocabularies[existingIdx].id;
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
          vietnameseMeaning: "",
          contextSentence: "",
          sourceUrl: "",
          sourceTitle: "Thêm từ popup",
          dateAdded: now,
          updatedAt: now,
          status: "learning",
          tags: []
        };
        vocabularies.unshift(newEntry);
      }

      await chrome.storage.local.set({ vocabularies });
      if (chrome.runtime?.id && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: "updateBadge" }).catch(() => {});
      }

      quickWordInput.value = '';
      await loadAndRender();

      // Phản hồi trực quan trên nút
      btnSubmit.innerHTML = '<span>✓ Đã thêm!</span>';
      setTimeout(() => {
        btnSubmit.innerHTML = originalBtnContent;
        btnSubmit.disabled = false;
      }, 1000);

      // 2. Tra cứu chi tiết online ngầm (tự động dịch tiếng Việt, phiên âm, audio như khi Save từ web)
      chrome.runtime.sendMessage({ action: "fetchDetails", word }, async (response) => {
        if (response && response.details) {
          const curStorage = await chrome.storage.local.get(['vocabularies']);
          const list = curStorage.vocabularies || [];
          const idx = list.findIndex(v => v.id === entryId);
          if (idx !== -1) {
            if (!list[idx].vietnameseMeaning && response.details.vietnameseMeaning) {
              list[idx].vietnameseMeaning = response.details.vietnameseMeaning;
            }
            list[idx].phonetic = response.details.phonetic || list[idx].phonetic;
            list[idx].audioUrl = response.details.audioUrl || list[idx].audioUrl;
            list[idx].partOfSpeech = response.details.partOfSpeech || list[idx].partOfSpeech;
            list[idx].englishMeaning = response.details.englishMeaning || list[idx].englishMeaning;
            if (!list[idx].contextSentence && response.details.example) {
              list[idx].contextSentence = `Example: ${response.details.example}`;
            }
            list[idx].updatedAt = new Date().toISOString();
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

    if (statTotal) statTotal.textContent = total;
    if (statLearning) statLearning.textContent = learning;
    if (statMastered) statMastered.textContent = mastered;
    // Chỉ lấy các từ đang học (chưa thuộc)
    const learningList = list.filter(item => item.status !== 'mastered');
    if (recentCount) recentCount.textContent = learningList.slice(0, 4).length;

    // Render 4 từ đang học mới nhất (khi đánh dấu đã thuộc sẽ biến mất và tự bù từ cũ hơn vào)
    const recents = learningList.slice(0, 4);
    if (recents.length === 0) {
      recentList.innerHTML = `
        <div class="empty-state">
          <p>${list.length > 0 ? '🎉 Tuyệt vời! Bạn đã thuộc hết các từ vựng.' : 'Chưa có từ vựng nào. Hãy bôi đen từ trên web & click chuột phải để lưu!'}</p>
        </div>
      `;
      return;
    }

    recentList.innerHTML = recents.map(item => {
      const isLong = (item.word && item.word.length > 28) || (item.word && item.word.split(/\s+/).length > 4) || (item.vietnameseMeaning && item.vietnameseMeaning.length > 35);
      return `
      <div class="recent-item ${isLong ? 'is-expandable' : ''}" data-id="${item.id}">
        <div class="item-left">
          <div class="item-word-row" title="Nhấp để xem đầy đủ / thu gọn">
            <span class="item-word" title="${escapeHtml(item.word)}">${escapeHtml(item.word)}</span>
            ${item.phonetic ? `<span class="item-phonetic">${escapeHtml(item.phonetic)}</span>` : ''}
            ${isLong ? `
              <span class="item-expand-icon" title="Nhấp để mở rộng / thu gọn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            ` : ''}
          </div>
          <div class="item-meaning-wrap">
            <span class="item-meaning" data-id="${item.id}" title="${escapeHtml(item.vietnameseMeaning || '')} (Nhấp vào đây để sửa nhanh nghĩa tiếng Việt / ghi chú)">${escapeHtml(item.vietnameseMeaning || 'Chưa có nghĩa tiếng Việt (Click để sửa)')}</span>
          </div>
          ${showEnDetail && item.englishMeaning ? `
            <div class="item-en-detail" title="${escapeHtml(item.englishMeaning)}">
              <span class="en-tag">EN</span>
              <span class="en-text">${escapeHtml(item.englishMeaning)}</span>
            </div>
          ` : ''}
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
    `}).join('');

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
          const now = new Date().toISOString();
          itemObj.vietnameseMeaning = newText;
          itemObj.lastReviewed = now;
          itemObj.updatedAt = now;
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

    // Attach expand/collapse toggle for rows
    recentList.querySelectorAll('.recent-item').forEach(itemEl => {
      itemEl.addEventListener('click', (e) => {
        // If clicking action buttons, meaning edit input, or meaning span, don't toggle
        if (
          e.target.closest('.item-actions') || 
          e.target.closest('button') || 
          e.target.closest('input') || 
          e.target.closest('.item-meaning-wrap')
        ) {
          return;
        }
        itemEl.classList.toggle('is-expanded');
      });
    });

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
          item.updatedAt = new Date().toISOString();
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
