// English Vocabulary Hub - Dashboard Logic

(function () {
  'use strict';

  // State
  let vocabularies = [];
  let selectedIds = new Set();
  let searchQuery = '';
  let statusFilter = 'all';
  let sortOrder = 'newest';
  let pendingImportData = null;

  // DOM Elements
  const countTotal = document.getElementById('count-total');
  const countLearning = document.getElementById('count-learning');
  const countMastered = document.getElementById('count-mastered');
  const masteryRate = document.getElementById('mastery-rate');
  const displayedCount = document.getElementById('displayed-count');
  const totalTableCount = document.getElementById('total-table-count');

  const searchInput = document.getElementById('search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const filterStatusSelect = document.getElementById('filter-status');
  const sortOrderSelect = document.getElementById('sort-order');

  const tableBody = document.getElementById('vocab-table-body');
  const emptyState = document.getElementById('table-empty-state');
  const selectAllCheckbox = document.getElementById('select-all-checkbox');

  const batchBar = document.getElementById('batch-actions-bar');
  const selectedCountEl = document.getElementById('selected-count');
  const btnBatchLearning = document.getElementById('btn-batch-learning');
  const btnBatchMastered = document.getElementById('btn-batch-mastered');
  const btnBatchDelete = document.getElementById('btn-batch-delete');

  // Modals & Forms
  const vocabModal = document.getElementById('vocab-modal');
  const vocabForm = document.getElementById('vocab-form');
  const modalTitle = document.getElementById('modal-title');
  const btnAddModal = document.getElementById('btn-add-modal');
  const modalBtnClose = document.getElementById('modal-btn-close');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnFetchDict = document.getElementById('btn-fetch-dict');

  const formVocabId = document.getElementById('form-vocab-id');
  const formWord = document.getElementById('form-word');
  const formPhonetic = document.getElementById('form-phonetic');
  const formVietnamese = document.getElementById('form-vietnamese');
  const formEnglish = document.getElementById('form-english');
  const formContext = document.getElementById('form-context');
  const formStatus = document.getElementById('form-status');
  const formAudio = document.getElementById('form-audio');

  // Export / Import
  const btnExportJson = document.getElementById('btn-export-json');
  const btnImportTrigger = document.getElementById('btn-import-json-trigger');
  const inputImportFile = document.getElementById('input-import-file');
  const importModal = document.getElementById('import-modal');
  const importFileCount = document.getElementById('import-file-count');
  const importBtnClose = document.getElementById('import-btn-close');
  const btnImportCancel = document.getElementById('btn-import-cancel');
  const btnImportConfirm = document.getElementById('btn-import-confirm');

  // Initialization
  document.addEventListener('DOMContentLoaded', async () => {
    await loadVocabularies();
    bindEvents();
  });

  // Load from chrome storage
  async function loadVocabularies() {
    try {
      const data = await chrome.storage.local.get(['vocabularies']);
      vocabularies = data.vocabularies || [];
      render();
    } catch (err) {
      console.error('Lỗi load dữ liệu:', err);
      showToast('Không thể đọc dữ liệu từ bộ nhớ!', 'error');
    }
  }

  // Save to chrome storage
  async function saveVocabularies() {
    try {
      await chrome.storage.local.set({ vocabularies });
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'updateBadge' }).catch(() => {});
      }
      render();
    } catch (err) {
      console.error('Lỗi lưu dữ liệu:', err);
      showToast('Lỗi khi lưu dữ liệu vào bộ nhớ!', 'error');
    }
  }

  // Bind Event Listeners
  function bindEvents() {
    // Search input
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      btnClearSearch.style.display = searchQuery ? 'block' : 'none';
      renderTable();
    });

    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      btnClearSearch.style.display = 'none';
      renderTable();
    });

    // Filters & Sort
    filterStatusSelect.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      renderTable();
    });

    sortOrderSelect.addEventListener('change', (e) => {
      sortOrder = e.target.value;
      renderTable();
    });

    // Select All
    selectAllCheckbox.addEventListener('change', (e) => {
      const filtered = getFilteredAndSortedList();
      if (e.target.checked) {
        filtered.forEach(item => selectedIds.add(item.id));
      } else {
        selectedIds.clear();
      }
      updateBatchBar();
      renderTable();
    });

    // Batch Actions
    btnBatchLearning.addEventListener('click', async () => {
      vocabularies.forEach(item => {
        if (selectedIds.has(item.id)) item.status = 'learning';
      });
      selectedIds.clear();
      await saveVocabularies();
      showToast('Đã chuyển trạng thái các từ đã chọn sang Đang học.');
    });

    btnBatchMastered.addEventListener('click', async () => {
      vocabularies.forEach(item => {
        if (selectedIds.has(item.id)) item.status = 'mastered';
      });
      selectedIds.clear();
      await saveVocabularies();
      showToast('Đã đánh dấu Đã thuộc cho các từ đã chọn.');
    });

    btnBatchDelete.addEventListener('click', async () => {
      if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} từ vựng đã chọn không?`)) return;
      vocabularies = vocabularies.filter(item => !selectedIds.has(item.id));
      selectedIds.clear();
      await saveVocabularies();
      showToast('Đã xóa các từ vựng đã chọn thành công.');
    });

    // Add Word Modal
    btnAddModal.addEventListener('click', () => {
      openAddModal();
    });

    modalBtnClose.addEventListener('click', closeVocabModal);
    btnModalCancel.addEventListener('click', closeVocabModal);

    vocabForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveWord();
    });

    // Dictionary Lookup in Modal
    btnFetchDict.addEventListener('click', async () => {
      const word = formWord.value.trim();
      if (!word) {
        showToast('Vui lòng nhập từ tiếng Anh trước!', 'info');
        return;
      }
      btnFetchDict.disabled = true;
      btnFetchDict.textContent = 'Đang tra...';
      try {
        const details = await fetchOnlineDictionary(word);
        if (details) {
          if (details.phonetic && !formPhonetic.value) formPhonetic.value = details.phonetic;
          if (details.audioUrl && !formAudio.value) formAudio.value = details.audioUrl;
          if (details.englishMeaning && !formEnglish.value) formEnglish.value = details.englishMeaning;
          if (details.example && !formContext.value) formContext.value = `Example: ${details.example}`;
          showToast(`Đã tìm thấy thông tin cho từ "${word}"!`);
        } else {
          showToast('Không tìm thấy dữ liệu từ điển online.', 'info');
        }
      } catch (err) {
        showToast('Lỗi khi tra cứu từ điển online.', 'error');
      } finally {
        btnFetchDict.disabled = false;
        btnFetchDict.textContent = 'Tra từ điển';
      }
    });

    // Export JSON
    btnExportJson.addEventListener('click', handleExportJson);

    // Import JSON
    btnImportTrigger.addEventListener('click', () => {
      inputImportFile.click();
    });

    inputImportFile.addEventListener('change', handleFileSelected);
    importBtnClose.addEventListener('click', () => importModal.style.display = 'none');
    btnImportCancel.addEventListener('click', () => importModal.style.display = 'none');
    btnImportConfirm.addEventListener('click', handleExecuteImport);
  }

  // Filter & Sort Logic
  function getFilteredAndSortedList() {
    let result = [...vocabularies];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter);
    }

    // Search query
    if (searchQuery) {
      result = result.filter(item => {
        const wordMatch = (item.word || '').toLowerCase().includes(searchQuery);
        const vietnameseMatch = (item.vietnameseMeaning || '').toLowerCase().includes(searchQuery);
        const englishMatch = (item.englishMeaning || '').toLowerCase().includes(searchQuery);
        const contextMatch = (item.contextSentence || '').toLowerCase().includes(searchQuery);
        return wordMatch || vietnameseMatch || englishMatch || contextMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0);
      } else if (sortOrder === 'oldest') {
        return new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0);
      } else if (sortOrder === 'az') {
        return (a.word || '').localeCompare(b.word || '');
      } else if (sortOrder === 'za') {
        return (b.word || '').localeCompare(a.word || '');
      }
      return 0;
    });

    return result;
  }

  // Render Everything
  function render() {
    renderStats();
    renderTable();
  }

  // Render Stats Cards
  function renderStats() {
    const total = vocabularies.length;
    const learning = vocabularies.filter(v => v.status === 'learning').length;
    const mastered = vocabularies.filter(v => v.status === 'mastered').length;
    const rate = total > 0 ? Math.round((mastered / total) * 100) : 0;

    countTotal.textContent = total;
    countLearning.textContent = learning;
    countMastered.textContent = mastered;
    masteryRate.textContent = `${rate}%`;
    totalTableCount.textContent = total;
  }

  // Render Table
  function renderTable() {
    const list = getFilteredAndSortedList();
    displayedCount.textContent = list.length;

    if (list.length === 0) {
      tableBody.innerHTML = '';
      emptyState.style.display = 'block';
      selectAllCheckbox.checked = false;
      updateBatchBar();
      return;
    }

    emptyState.style.display = 'none';

    // Check if all filtered are selected
    const allSelected = list.length > 0 && list.every(item => selectedIds.has(item.id));
    selectAllCheckbox.checked = allSelected;

    tableBody.innerHTML = list.map((item, index) => {
      const isSelected = selectedIds.has(item.id);
      const formattedDate = formatDate(item.dateAdded);
      const isMastered = item.status === 'mastered';

      return `
        <tr data-id="${item.id}" class="${isSelected ? 'row-selected' : ''}">
          <td>
            <input type="checkbox" class="row-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
          </td>
          <td class="text-muted">${index + 1}</td>
          <td>
            <div class="cell-word-box">
              <span class="word-text">${escapeHtml(item.word)}</span>
              <button class="btn-speak-inline" title="Phát âm" data-word="${escapeHtml(item.word)}" data-audio="${escapeHtml(item.audioUrl || '')}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              </button>
            </div>
          </td>
          <td>
            <span class="cell-phonetic">${escapeHtml(item.phonetic || '—')}</span>
          </td>
          <td>
            <div class="editable-cell ${!item.vietnameseMeaning ? 'is-empty' : ''}" data-field="vietnameseMeaning" data-id="${item.id}" title="Click đúp để chỉnh sửa nhanh">
              ${escapeHtml(item.vietnameseMeaning || 'Chưa có nghĩa (Click đúp để sửa)')}
            </div>
          </td>
          <td>
            <div class="cell-context editable-cell ${!item.contextSentence ? 'is-empty' : ''}" data-field="contextSentence" data-id="${item.id}" title="${escapeHtml(item.contextSentence || 'Click đúp để sửa ví dụ')}">
              ${escapeHtml(item.contextSentence || 'Chưa có câu ví dụ')}
            </div>
          </td>
          <td class="text-muted" style="font-size: 12.5px;">${formattedDate}</td>
          <td>
            <span class="status-badge ${isMastered ? 'status-mastered' : 'status-learning'}" data-id="${item.id}" data-status="${item.status}" title="Click để đổi trạng thái">
              <span class="status-dot"></span>
              <span>${isMastered ? 'Đã thuộc' : 'Đang học'}</span>
            </span>
          </td>
          <td>
            <div class="table-actions">
              <button class="action-icon-btn btn-edit" data-id="${item.id}" title="Chỉnh sửa chi tiết">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="action-icon-btn btn-delete" data-id="${item.id}" title="Xóa từ này">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachTableListeners();
    updateBatchBar();
  }

  // Attach Table Event Listeners
  function attachTableListeners() {
    // Checkboxes
    tableBody.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = cb.getAttribute('data-id');
        if (cb.checked) {
          selectedIds.add(id);
        } else {
          selectedIds.delete(id);
        }
        updateBatchBar();
        renderTable();
      });
    });

    // Pronounce buttons
    tableBody.querySelectorAll('.btn-speak-inline').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const word = btn.getAttribute('data-word');
        const audioUrl = btn.getAttribute('data-audio');
        playPronunciation(word, audioUrl);
      });
    });

    // Status Badge toggle
    tableBody.querySelectorAll('.status-badge').forEach(badge => {
      badge.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = badge.getAttribute('data-id');
        const currentStatus = badge.getAttribute('data-status');
        const newStatus = currentStatus === 'mastered' ? 'learning' : 'mastered';

        const item = vocabularies.find(v => v.id === id);
        if (item) {
          item.status = newStatus;
          await saveVocabularies();
          showToast(`Đã chuyển "${item.word}" sang ${newStatus === 'mastered' ? 'Đã thuộc' : 'Đang học'}.`);
        }
      });
    });

    // Edit Button
    tableBody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openEditModal(id);
      });
    });

    // Delete Button
    tableBody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const item = vocabularies.find(v => v.id === id);
        if (!item) return;

        if (confirm(`Bạn có chắc muốn xóa từ "${item.word}" không?`)) {
          vocabularies = vocabularies.filter(v => v.id !== id);
          selectedIds.delete(id);
          await saveVocabularies();
          showToast(`Đã xóa từ "${item.word}".`);
        }
      });
    });

    // Inline Editing (Double Click)
    tableBody.querySelectorAll('.editable-cell').forEach(cell => {
      cell.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        handleInlineEdit(cell);
      });
    });
  }

  // Handle Inline Edit
  function handleInlineEdit(cell) {
    if (cell.querySelector('input, textarea')) return; // already editing

    const field = cell.getAttribute('data-field');
    const id = cell.getAttribute('data-id');
    const item = vocabularies.find(v => v.id === id);
    if (!item) return;

    const currentValue = item[field] || '';
    const isMultiline = field === 'contextSentence';

    const input = document.createElement(isMultiline ? 'textarea' : 'input');
    input.className = 'inline-edit-input';
    if (!isMultiline) input.type = 'text';
    input.value = currentValue;
    if (isMultiline) input.rows = 3;

    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();

    async function commit() {
      const newValue = input.value.trim();
      item[field] = newValue;
      await saveVocabularies();
      showToast('Đã cập nhật từ vựng.');
    }

    function cancel() {
      renderTable();
    }

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !isMultiline) {
        input.blur();
      } else if (e.key === 'Escape') {
        input.removeEventListener('blur', commit);
        cancel();
      }
    });
  }

  // Update Batch Bar UI
  function updateBatchBar() {
    if (selectedIds.size > 0) {
      batchBar.style.display = 'flex';
      selectedCountEl.textContent = selectedIds.size;
    } else {
      batchBar.style.display = 'none';
    }
  }

  // Open Add Modal
  function openAddModal() {
    modalTitle.textContent = 'Thêm từ vựng mới';
    vocabForm.reset();
    formVocabId.value = '';
    formStatus.value = 'learning';
    vocabModal.style.display = 'flex';
    formWord.focus();
  }

  // Open Edit Modal
  function openEditModal(id) {
    const item = vocabularies.find(v => v.id === id);
    if (!item) return;

    modalTitle.textContent = `Chỉnh sửa từ "${item.word}"`;
    formVocabId.value = item.id;
    formWord.value = item.word || '';
    formPhonetic.value = item.phonetic || '';
    formVietnamese.value = item.vietnameseMeaning || '';
    formEnglish.value = item.englishMeaning || '';
    formContext.value = item.contextSentence || '';
    formStatus.value = item.status || 'learning';
    formAudio.value = item.audioUrl || '';

    vocabModal.style.display = 'flex';
  }

  function closeVocabModal() {
    vocabModal.style.display = 'none';
    vocabForm.reset();
  }

  // Handle Save Word in Modal
  async function handleSaveWord() {
    const id = formVocabId.value;
    const word = formWord.value.trim();
    const phonetic = formPhonetic.value.trim();
    const vietnameseMeaning = formVietnamese.value.trim();
    const englishMeaning = formEnglish.value.trim();
    const contextSentence = formContext.value.trim();
    const status = formStatus.value;
    const audioUrl = formAudio.value.trim();

    if (!word || !vietnameseMeaning) {
      showToast('Vui lòng điền từ tiếng Anh và nghĩa tiếng Việt!', 'error');
      return;
    }

    if (id) {
      // Edit existing
      const index = vocabularies.findIndex(v => v.id === id);
      if (index !== -1) {
        vocabularies[index] = {
          ...vocabularies[index],
          word,
          phonetic,
          vietnameseMeaning,
          englishMeaning,
          contextSentence,
          status,
          audioUrl,
          lastReviewed: new Date().toISOString()
        };
        showToast(`Đã cập nhật từ "${word}".`);
      }
    } else {
      // Add new
      const newEntry = {
        id: "vocab_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
        word,
        phonetic,
        vietnameseMeaning,
        englishMeaning,
        contextSentence,
        status,
        audioUrl,
        dateAdded: new Date().toISOString(),
        sourceUrl: '',
        sourceTitle: 'Thêm thủ công',
        tags: []
      };
      vocabularies.unshift(newEntry);
      showToast(`Đã thêm từ "${word}" thành công.`);
    }

    await saveVocabularies();
    closeVocabModal();
  }

  // Audio Pronunciation
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

  // Free Dictionary API helper
  async function fetchOnlineDictionary(word) {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
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
      let example = '';
      if (entry.meanings && entry.meanings.length > 0) {
        const firstMeaning = entry.meanings[0];
        if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
          englishMeaning = firstMeaning.definitions[0].definition || '';
          example = firstMeaning.definitions[0].example || '';
        }
      }

      return { phonetic, audioUrl, englishMeaning, example };
    } catch (e) {
      return null;
    }
  }

  // Export JSON functionality
  function handleExportJson() {
    if (vocabularies.length === 0) {
      showToast('Danh sách từ vựng đang trống!', 'info');
      return;
    }

    const exportPayload = {
      app: "English Vocabulary Saver",
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      total: vocabularies.length,
      vocabularies: vocabularies
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `english_vocabularies_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast(`Đã xuất ${vocabularies.length} từ vựng ra file JSON!`);
  }

  // Import JSON functionality
  function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const parsed = JSON.parse(event.target.result);
        let items = [];

        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed && Array.isArray(parsed.vocabularies)) {
          items = parsed.vocabularies;
        } else {
          throw new Error('Định dạng file không hợp lệ');
        }

        // Validate items
        const validItems = items.filter(it => it && typeof it.word === 'string');
        if (validItems.length === 0) {
          showToast('File JSON không chứa từ vựng hợp lệ!', 'error');
          return;
        }

        pendingImportData = validItems;
        importFileCount.textContent = validItems.length;
        importModal.style.display = 'flex';
      } catch (err) {
        showToast('Lỗi đọc file JSON: ' + err.message, 'error');
      } finally {
        inputImportFile.value = '';
      }
    };
    reader.readAsText(file);
  }

  async function handleExecuteImport() {
    if (!pendingImportData || pendingImportData.length === 0) return;

    const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'merge';

    if (mode === 'overwrite') {
      vocabularies = pendingImportData.map(normalizeImportItem);
    } else {
      // Merge
      const map = new Map();
      vocabularies.forEach(v => map.set(v.word.toLowerCase(), v));

      pendingImportData.forEach(item => {
        const normalized = normalizeImportItem(item);
        const key = normalized.word.toLowerCase();
        if (map.has(key)) {
          // Merge fields if missing
          const existing = map.get(key);
          map.set(key, {
            ...existing,
            vietnameseMeaning: normalized.vietnameseMeaning || existing.vietnameseMeaning,
            phonetic: normalized.phonetic || existing.phonetic,
            audioUrl: normalized.audioUrl || existing.audioUrl,
            contextSentence: normalized.contextSentence || existing.contextSentence,
            englishMeaning: normalized.englishMeaning || existing.englishMeaning
          });
        } else {
          map.set(key, normalized);
        }
      });

      vocabularies = Array.from(map.values());
    }

    await saveVocabularies();
    importModal.style.display = 'none';
    showToast(`Đã nhập thành công ${pendingImportData.length} từ vựng!`);
    pendingImportData = null;
  }

  function normalizeImportItem(item) {
    return {
      id: item.id || ("vocab_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8)),
      word: item.word ? item.word.trim() : "",
      phonetic: item.phonetic || "",
      vietnameseMeaning: item.vietnameseMeaning || "",
      englishMeaning: item.englishMeaning || "",
      contextSentence: item.contextSentence || "",
      status: item.status === 'mastered' ? 'mastered' : 'learning',
      audioUrl: item.audioUrl || "",
      dateAdded: item.dateAdded || new Date().toISOString(),
      sourceUrl: item.sourceUrl || "",
      sourceTitle: item.sourceTitle || "",
      tags: Array.isArray(item.tags) ? item.tags : []
    };
  }

  // Utilities
  function formatDate(isoString) {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

})();
