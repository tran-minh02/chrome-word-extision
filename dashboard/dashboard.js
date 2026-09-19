// English Vocabulary Hub - Dashboard Logic

(function () {
  'use strict';

  // Polyfill chrome.storage.local for local web development server
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    window.chrome = window.chrome || {};
    window.chrome.storage = window.chrome.storage || {};
    window.chrome.storage.local = {
      async get(keys) {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          try {
            const raw = localStorage.getItem(k);
            if (raw !== null) result[k] = JSON.parse(raw);
          } catch (_) {}
        }
        return result;
      },
      async set(items) {
        for (const [k, v] of Object.entries(items)) {
          try {
            localStorage.setItem(k, JSON.stringify(v));
          } catch (_) {}
        }
      }
    };
  }

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
  const btnModalSave = document.getElementById('btn-modal-save');
  const btnFetchDict = document.getElementById('btn-fetch-dict');
  let isFetchingDict = false;
  let dictAbortController = null;

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

  // Cloud Sync Elements
  const btnCloudSyncTrigger = document.getElementById('btn-cloud-sync-trigger');
  const cloudModal = document.getElementById('cloud-modal');
  const cloudBtnClose = document.getElementById('cloud-btn-close');
  const cloudEmail = document.getElementById('cloud-email');
  const cloudPassword = document.getElementById('cloud-password');
  const btnCloudLogin = document.getElementById('btn-cloud-login');
  const btnCloudRegister = document.getElementById('btn-cloud-register');
  const cloudAuthLoggedOut = document.getElementById('cloud-auth-logged-out');
  const cloudAuthLoggedIn = document.getElementById('cloud-auth-logged-in');
  const cloudUserEmail = document.getElementById('cloud-user-email');
  const btnCloudSyncNow = document.getElementById('btn-cloud-sync-now');
  const btnCloudSetupMfa = document.getElementById('btn-cloud-setup-mfa');
  const btnCloudLogout = document.getElementById('btn-cloud-logout');
  const cloudMfaBox = document.getElementById('cloud-mfa-box');
  const cloudMfaQr = document.getElementById('cloud-mfa-qr');
  const cloudMfaSecret = document.getElementById('cloud-mfa-secret');
  const btnCopySecret = document.getElementById('btn-copy-secret');
  const cloudMfaCode = document.getElementById('cloud-mfa-code');
  const btnCloudVerifyMfa = document.getElementById('btn-cloud-verify-mfa');
  let currentMfaFactorId = null;

  // Login 2FA OTP Elements
  const cloudLoginFields = document.getElementById('cloud-login-fields');
  const cloudLoginMfaStep = document.getElementById('cloud-login-mfa-step');
  const cloudLoginOtp = document.getElementById('cloud-login-otp');
  const btnCloudConfirmOtp = document.getElementById('btn-cloud-confirm-otp');
  const btnCloudCancelOtp = document.getElementById('btn-cloud-cancel-otp');
  let pendingLoginFactorId = null;

  // English Detail Display Toggle
  const toggleDashboardEn = document.getElementById('toggle-dashboard-en');
  let showDashboardEn = true;

  // Initialization
  document.addEventListener('DOMContentLoaded', async () => {
    await loadVocabularies();
    if (window.supabaseSync) await window.supabaseSync.init();
    bindEvents();
  });

  // Load from chrome storage
  async function loadVocabularies() {
    try {
      const data = await chrome.storage.local.get(['vocabularies', 'showDashboardEn']);
      vocabularies = data.vocabularies || [];
      if (data.showDashboardEn !== undefined) {
        showDashboardEn = data.showDashboardEn;
      }
      if (toggleDashboardEn) {
        toggleDashboardEn.checked = showDashboardEn;
      }
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
      if (chrome.runtime?.id && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({ action: 'updateBadge' }).catch(() => {});
        } catch (_) {}
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

    // Toggle English Detail in Table
    if (toggleDashboardEn) {
      toggleDashboardEn.addEventListener('change', async (e) => {
        showDashboardEn = e.target.checked;
        await chrome.storage.local.set({ showDashboardEn });
        renderTable();
      });
    }

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
      if (isFetchingDict) {
        showToast('Hệ thống đang tra từ điển, vui lòng đợi trong giây lát!', 'warning');
        return;
      }
      await handleSaveWord();
    });

    // Dictionary Lookup in Modal - Tối ưu siêu tốc (200ms) & chống race condition
    btnFetchDict.addEventListener('click', async () => {
      if (isFetchingDict) return;
      const word = formWord.value.trim();
      if (!word) {
        showToast('Vui lòng nhập từ tiếng Anh trước!', 'info');
        return;
      }

      isFetchingDict = true;
      const requestedWord = word;

      // Khóa nút Lưu & ô nhập từ để tránh lưu sai lệch khi đang tra
      btnFetchDict.disabled = true;
      btnFetchDict.textContent = 'Đang tra...';
      if (btnModalSave) {
        btnModalSave.disabled = true;
        btnModalSave.textContent = 'Đang tra cứu...';
      }
      formWord.disabled = true;

      dictAbortController = new AbortController();

      try {
        const details = await fetchOnlineDictionary(requestedWord, dictAbortController.signal);

        // Kiểm tra an toàn: nếu modal đã đóng hoặc từ đã bị đổi thì hủy gán dữ liệu
        if (vocabModal.style.display === 'none' || formWord.value.trim().toLowerCase() !== requestedWord.toLowerCase()) {
          return;
        }

        if (details && (details.vietnameseMeaning || details.englishMeaning)) {
          formVietnamese.value = details.vietnameseMeaning || formVietnamese.value;
          formEnglish.value = details.englishMeaning || formEnglish.value;
          formPhonetic.value = details.phonetic || formPhonetic.value;
          formAudio.value = details.audioUrl || formAudio.value;
          if (details.example) {
            formContext.value = `Example: ${details.example}`;
          }
          showToast(`Đã tìm thấy thông tin cho từ "${requestedWord}"!`);
        } else {
          showToast('Không tìm thấy dữ liệu từ điển online.', 'info');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          showToast('Lỗi khi tra cứu từ điển online.', 'error');
        }
      } finally {
        isFetchingDict = false;
        formWord.disabled = false;
        if (btnModalSave) {
          btnModalSave.disabled = false;
          btnModalSave.textContent = 'Lưu từ vựng';
        }
        btnFetchDict.disabled = false;
        btnFetchDict.textContent = 'Tra từ điển';
        dictAbortController = null;
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

    // Cloud Sync Modal Triggers & Events
    btnCloudSyncTrigger.addEventListener('click', openCloudModal);
    cloudBtnClose.addEventListener('click', () => { cloudModal.style.display = 'none'; });
    btnCloudLogin.addEventListener('click', handleCloudLogin);
    btnCloudRegister.addEventListener('click', handleCloudRegister);
    btnCloudLogout.addEventListener('click', handleCloudLogout);
    btnCloudSyncNow.addEventListener('click', handleCloudSyncNow);
    btnCloudSetupMfa.addEventListener('click', handleCloudSetupMfa);
    btnCloudVerifyMfa.addEventListener('click', handleCloudVerifyMfa);
    btnCloudConfirmOtp.addEventListener('click', handleCloudConfirmLoginOtp);
    btnCloudCancelOtp.addEventListener('click', () => {
      cloudLoginFields.style.display = 'block';
      cloudLoginMfaStep.style.display = 'none';
      cloudLoginOtp.value = '';
      pendingLoginFactorId = null;
    });
    cloudLoginOtp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCloudConfirmLoginOtp();
      }
    });
    btnCopySecret.addEventListener('click', () => {
      const secret = cloudMfaSecret.textContent.trim();
      if (secret) {
        navigator.clipboard.writeText(secret).then(() => {
          showToast('Đã sao chép mã khóa bí mật!');
        });
      }
    });
  }

  // Cloud Modal UI & Actions
  function openCloudModal() {
    cloudModal.style.display = 'flex';
    updateCloudModalUI();
  }

  function updateCloudModalUI() {
    const session = window.supabaseSync.session;
    let email = session?.user?.email;
    if (!email && session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        email = payload.email || payload.sub;
      } catch (_) {}
    }

    if (session?.access_token && email) {
      cloudAuthLoggedOut.style.display = 'none';
      cloudAuthLoggedIn.style.display = 'block';
      cloudUserEmail.textContent = email;

      // Kiểm tra trạng thái 2FA của tài khoản
      const hasMFA = session?.user?.factors?.some(f => f.status === 'verified');
      if (hasMFA) {
        btnCloudSetupMfa.innerHTML = '<span>✓ Bảo mật 2 lớp (TOTP): Đã kích hoạt</span>';
        btnCloudSetupMfa.style.color = '#34d399';
        btnCloudSetupMfa.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      } else {
        btnCloudSetupMfa.innerHTML = '<span>Cài đặt bảo mật 2 lớp (Authenticator)</span>';
        btnCloudSetupMfa.style.color = '';
        btnCloudSetupMfa.style.borderColor = '';
      }
    } else {
      cloudAuthLoggedOut.style.display = 'block';
      cloudAuthLoggedIn.style.display = 'none';
      cloudMfaBox.style.display = 'none';
      cloudLoginFields.style.display = 'block';
      cloudLoginMfaStep.style.display = 'none';
      cloudLoginOtp.value = '';
      pendingLoginFactorId = null;
    }
  }

  async function handleCloudLogin() {
    const email = cloudEmail.value.trim();
    const password = cloudPassword.value;
    if (!email || !password) {
      showToast('Vui lòng điền email và mật khẩu!', 'error');
      return;
    }
    btnCloudLogin.disabled = true;
    btnCloudLogin.textContent = 'Đang đăng nhập...';
    try {
      const res = await window.supabaseSync.signIn(email, password);
      if (res && res.needsMFA) {
        pendingLoginFactorId = res.factorId;
        cloudLoginFields.style.display = 'none';
        cloudLoginMfaStep.style.display = 'block';
        cloudLoginOtp.value = '';
        cloudLoginOtp.focus();
        showToast('Tài khoản đã bật 2FA. Vui lòng nhập mã 6 số!');
        return;
      }
      showToast('Đăng nhập thành công!');
      updateCloudModalUI();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnCloudLogin.disabled = false;
      btnCloudLogin.textContent = 'Đăng nhập';
    }
  }

  async function handleCloudConfirmLoginOtp() {
    const code = cloudLoginOtp.value.trim();
    if (!code || code.length !== 6 || !pendingLoginFactorId) {
      showToast('Vui lòng nhập đủ 6 chữ số từ app Authenticator!', 'error');
      return;
    }
    btnCloudConfirmOtp.disabled = true;
    btnCloudConfirmOtp.textContent = 'Đang xác thực...';
    try {
      await window.supabaseSync.verifyMFA(pendingLoginFactorId, code);
      showToast('Đăng nhập 2 lớp thành công!');
      cloudLoginFields.style.display = 'block';
      cloudLoginMfaStep.style.display = 'none';
      cloudLoginOtp.value = '';
      pendingLoginFactorId = null;
      updateCloudModalUI();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnCloudConfirmOtp.disabled = false;
      btnCloudConfirmOtp.textContent = 'Xác nhận';
    }
  }

  async function handleCloudRegister() {
    const email = cloudEmail.value.trim();
    const password = cloudPassword.value;
    if (!email || !password) {
      showToast('Vui lòng điền email và mật khẩu!', 'error');
      return;
    }
    btnCloudRegister.disabled = true;
    btnCloudRegister.textContent = 'Đang đăng ký...';
    try {
      await window.supabaseSync.signUp(email, password);
      showToast('Đăng ký thành công! Kiểm tra email để xác thực nếu cần.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnCloudRegister.disabled = false;
      btnCloudRegister.textContent = 'Đăng ký';
    }
  }

  async function handleCloudLogout() {
    await window.supabaseSync.signOut();
    updateCloudModalUI();
    showToast('Đã đăng xuất.');
  }

  async function handleCloudSyncNow() {
    btnCloudSyncNow.disabled = true;
    btnCloudSyncNow.textContent = 'Đang đồng bộ...';
    try {
      vocabularies = await window.supabaseSync.sync(vocabularies);
      await saveVocabularies();
      showToast('Đồng bộ từ vựng với đám mây thành công!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnCloudSyncNow.disabled = false;
      btnCloudSyncNow.textContent = 'Đồng bộ dữ liệu ngay';
    }
  }

  async function handleCloudSetupMfa() {
    btnCloudSetupMfa.disabled = true;
    btnCloudSetupMfa.textContent = 'Đang tạo mã...';
    try {
      const res = await window.supabaseSync.enrollMFA();
      currentMfaFactorId = res.id;
      if (res.totp?.qr_code) {
        if (res.totp.qr_code.startsWith('data:image/')) {
          cloudMfaQr.innerHTML = `<img src="${res.totp.qr_code}" alt="2FA QR Code">`;
        } else {
          cloudMfaQr.innerHTML = res.totp.qr_code;
        }
      }
      if (res.totp?.secret) {
        cloudMfaSecret.textContent = res.totp.secret;
      }
      cloudMfaBox.style.display = 'block';
      showToast('Quét mã QR hoặc sao chép khóa bí mật vào app Authenticator.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnCloudSetupMfa.disabled = false;
      btnCloudSetupMfa.textContent = 'Cài đặt bảo mật 2 lớp (Authenticator)';
    }
  }

  async function handleCloudVerifyMfa() {
    const code = cloudMfaCode.value.trim();
    if (!code || code.length !== 6 || !currentMfaFactorId) {
      showToast('Vui lòng nhập đủ 6 chữ số!', 'error');
      return;
    }
    btnCloudVerifyMfa.disabled = true;
    try {
      await window.supabaseSync.verifyMFA(currentMfaFactorId, code);
      showToast('Đã kích hoạt bảo mật 2 lớp thành công!');
      cloudMfaBox.style.display = 'none';
      cloudMfaCode.value = '';
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnCloudVerifyMfa.disabled = false;
    }
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
            <div class="cell-meaning-box">
              <div class="editable-cell ${!item.vietnameseMeaning ? 'is-empty' : ''}" data-field="vietnameseMeaning" data-id="${item.id}" title="Click đúp để chỉnh sửa nhanh nghĩa tiếng Việt">
                ${escapeHtml(item.vietnameseMeaning || 'Chưa có nghĩa tiếng Việt (Click đúp để sửa)')}
              </div>
              ${showDashboardEn && item.englishMeaning ? `
                <div class="cell-en-sub" title="${escapeHtml(item.englishMeaning)}">
                  <span class="en-badge">EN</span>
                  <span class="en-sub-text">${escapeHtml(item.englishMeaning)}</span>
                </div>
              ` : ''}
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
    if (dictAbortController) {
      try { dictAbortController.abort(); } catch (_) {}
      dictAbortController = null;
    }
    isFetchingDict = false;
    formWord.disabled = false;
    if (btnModalSave) {
      btnModalSave.disabled = false;
      btnModalSave.textContent = 'Lưu từ vựng';
    }
    btnFetchDict.disabled = false;
    btnFetchDict.textContent = 'Tra từ điển';
    vocabModal.style.display = 'none';
    vocabForm.reset();
  }

  // Handle Save Word in Modal
  async function handleSaveWord() {
    if (isFetchingDict) {
      showToast('Hệ thống đang tra từ điển, vui lòng đợi trong giây lát!', 'warning');
      return;
    }
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

  // Tra cứu từ điển kết hợp: Google Translate (tiếng Việt + chi tiết EN) + Free Dictionary (Anh - Anh)
  // Tối ưu siêu tốc (150-250ms), không bị treo và có cơ chế AbortController
  async function fetchOnlineDictionary(word, externalSignal) {
    const cleanWord = word.trim().toLowerCase();
    let vietnameseMeaning = '';
    let phonetic = '';
    let audioUrl = '';
    let englishMeaning = '';
    let partOfSpeech = '';
    let example = '';

    // A. Google Translate (Dịch tiếng Việt + Định nghĩa tiếng Anh + Ví dụ + Phiên âm)
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=en&tl=vi&dt=t&dt=bd&dt=md&dt=ss&dt=ex&dt=rm&q=${encodeURIComponent(cleanWord)}`;
      const signal = externalSignal || AbortSignal.timeout(2500);
      const res = await fetch(gUrl, { signal });
      if (res.ok) {
        const data = await res.json();
        // 1. Nghĩa tiếng Việt
        if (data && data[0] && Array.isArray(data[0])) {
          vietnameseMeaning = data[0].map(item => item[0]).filter(Boolean).join('').trim();
          // Phiên âm từ dt=rm (nằm ở data[0][1][3])
          if (data[0][1] && data[0][1][3]) {
            phonetic = data[0][1][3];
          }
        }
        // 2. Định nghĩa tiếng Anh từ dt=md
        if (data && data[12] && Array.isArray(data[12])) {
          for (const group of data[12]) {
            if (!partOfSpeech && group[0]) partOfSpeech = group[0];
            const defs = group[1] || [];
            if (defs[0] && defs[0][0]) {
              englishMeaning = defs[0][0];
              if (defs[0][2]) example = defs[0][2];
              break;
            }
          }
        }
        // 3. Ví dụ từ dt=ex
        if (!example && data && data[13] && Array.isArray(data[13])) {
          if (data[13][0] && data[13][0][0]) {
            example = data[13][0][0].replace(/<\/?b>/g, '');
          }
        }
      }
    } catch (_) {
      try {
        const fallbackUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(cleanWord)}`;
        const fbRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(2000) });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          if (fbData && fbData[0]) {
            vietnameseMeaning = fbData[0].map(item => item[0]).filter(Boolean).join('').trim();
          }
        }
      } catch (e) {}
    }

    // B. Free Dictionary API: Chỉ tra cứu bổ sung khi thiếu phonetic hoặc định nghĩa EN, với timeout ngắn 600ms
    if (!phonetic || !englishMeaning) {
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`, {
          signal: AbortSignal.timeout(600)
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const entry = data[0];
            if (!phonetic && entry.phonetic) phonetic = entry.phonetic;
            if (entry.phonetics && Array.isArray(entry.phonetics)) {
              for (const p of entry.phonetics) {
                if (!phonetic && p.text) phonetic = p.text;
                if (!audioUrl && p.audio) {
                  audioUrl = p.audio;
                  break;
                }
              }
            }
            if (entry.meanings && entry.meanings.length > 0) {
              const first = entry.meanings[0];
              if (!partOfSpeech && first.partOfSpeech) partOfSpeech = first.partOfSpeech;
              if (!englishMeaning && first.definitions && first.definitions.length > 0) {
                englishMeaning = first.definitions[0].definition || '';
                if (!example) example = first.definitions[0].example || '';
              }
            }
          }
        }
      } catch (_) {}
    }

    if (!audioUrl) {
      audioUrl = `https://translate.googleapis.com/translate_tts?client=dict-chrome-ex&tl=en&q=${encodeURIComponent(cleanWord)}`;
    }

    return { vietnameseMeaning, phonetic, audioUrl, englishMeaning, example, partOfSpeech };
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
