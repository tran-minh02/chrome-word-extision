// Cloud Sync Module for Supabase (Native Fetch - Zero Dependencies)

// Polyfill/Shim hỗ trợ test local trên trình duyệt thông thường không có extension
if (typeof window !== 'undefined' && (!window.chrome || !window.chrome.storage)) {
  window.chrome = window.chrome || {};
  window.chrome.storage = {
    local: {
      get: async (keys) => {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          const val = localStorage.getItem(k);
          if (val !== null) {
            try { result[k] = JSON.parse(val); } catch (_) { result[k] = val; }
          }
        }
        return result;
      },
      set: async (items) => {
        for (const [k, v] of Object.entries(items)) {
          localStorage.setItem(k, JSON.stringify(v));
        }
      },
      remove: async (keys) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          localStorage.removeItem(k);
        }
      }
    }
  };
  window.chrome.runtime = window.chrome.runtime || {
    sendMessage: () => Promise.resolve(),
    openOptionsPage: () => { }
  };
}

const DEFAULT_SUPABASE_URL = "https://htfckygwvjmbarftauww.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_ShWis3O-lBy6t4oCmm5w5g_6wiDfqN5";

class SupabaseSync {
  constructor() {
    this.url = DEFAULT_SUPABASE_URL;
    this.anonKey = DEFAULT_SUPABASE_ANON_KEY;
    this.session = null;
  }

  async init() {
    const config = await chrome.storage.local.get([
      'supabase_url',
      'supabase_anon_key',
      'supabase_session'
    ]);
    this.url = config.supabase_url || DEFAULT_SUPABASE_URL;
    this.anonKey = config.supabase_anon_key || DEFAULT_SUPABASE_ANON_KEY;
    this.session = config.supabase_session || null;
  }

  getUserId() {
    if (this.session?.user?.id) return this.session.user.id;
    if (this.session?.access_token) {
      try {
        const payload = JSON.parse(atob(this.session.access_token.split('.')[1]));
        return payload.sub;
      } catch (_) {}
    }
    return null;
  }

  async saveConfig(url, anonKey) {
    this.url = url || DEFAULT_SUPABASE_URL;
    this.anonKey = anonKey || DEFAULT_SUPABASE_ANON_KEY;
    await chrome.storage.local.set({
      supabase_url: this.url,
      supabase_anon_key: this.anonKey
    });
  }

  getHeaders(withAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.anonKey
    };
    const token = this.session?.access_token || this.tempSession?.access_token;
    if (withAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  isLoggedIn() {
    return !!(this.session?.access_token);
  }

  // Xóa từ vựng trên Cloud Supabase (hỗ trợ xóa theo mảng ID hoặc Word)
  async deleteWords(items) {
    if (!this.session?.access_token) return 0;
    if (!items || items.length === 0) return 0;

    const ids = [];
    const words = [];
    items.forEach(it => {
      if (typeof it === 'string') {
        if (it.startsWith('vocab_')) ids.push(it);
        else words.push(it);
      } else if (it && typeof it === 'object') {
        if (it.id) ids.push(it.id);
        if (it.word) words.push(it.word);
      }
    });

    const headers = this.getHeaders(true);
    let deletedCount = 0;

    // 1. Xóa theo ID (primary key)
    if (ids.length > 0) {
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const idFilter = chunk.join(',');
        try {
          const res = await fetch(`${this.url}/rest/v1/vocabularies?id=in.(${idFilter})`, {
            method: 'DELETE',
            headers
          });
          if (res.ok) deletedCount += chunk.length;
        } catch (e) {
          console.warn('Lỗi khi gửi yêu cầu DELETE theo id lên Supabase:', e);
        }
      }
    }

    // 2. Xóa theo word (phòng ngừa trường hợp id không khớp hoặc client khác)
    if (words.length > 0) {
      for (let i = 0; i < words.length; i += 50) {
        const chunk = words.slice(i, i + 50);
        const wordFilter = chunk.map(w => `"${w}"`).join(',');
        try {
          await fetch(`${this.url}/rest/v1/vocabularies?word=in.(${wordFilter})`, {
            method: 'DELETE',
            headers
          });
        } catch (e) {
          console.warn('Lỗi khi gửi yêu cầu DELETE theo word lên Supabase:', e);
        }
      }
    }

    return deletedCount;
  }

  // 1. Đăng ký tài khoản
  async signUp(email, password) {
    const res = await fetch(`${this.url}/auth/v1/signup`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || data.error_description || 'Đăng ký thất bại');
    return data;
  }

  // 2. Đăng nhập (Tự động phát hiện 2FA)
  async signIn(email, password) {
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || data.error_description || 'Sai email hoặc mật khẩu');

    // Kiểm tra xem tài khoản này đã kích hoạt 2FA TOTP chưa
    const verifiedFactor = data.user?.factors?.find(f => f.status === 'verified');
    if (verifiedFactor) {
      this.tempSession = data; // Giữ session aal1 tạm thời
      return {
        needsMFA: true,
        factorId: verifiedFactor.id,
        user: data.user
      };
    }

    this.session = data;
    this.tempSession = null;
    await chrome.storage.local.set({ supabase_session: this.session });
    return { needsMFA: false, session: data };
  }

  // 3. Đăng xuất
  async signOut() {
    if (this.session?.access_token) {
      try {
        await fetch(`${this.url}/auth/v1/logout`, {
          method: 'POST',
          headers: this.getHeaders(true)
        });
      } catch (_) { }
    }
    this.session = null;
    this.tempSession = null;
    await chrome.storage.local.remove(['supabase_session']);
  }

  // 4. Lấy danh sách 2FA Factors đã liên kết
  async getMFAFactors() {
    const res = await fetch(`${this.url}/auth/v1/factors`, {
      headers: this.getHeaders(true)
    });
    const data = await res.json();
    if (!res.ok) return [];
    return data.all || data || [];
  }

  // 5. Khởi tạo 2FA TOTP (Authenticator App)
  async enrollMFA(friendlyName = 'English Vocabulary Saver') {
    const res = await fetch(`${this.url}/auth/v1/factors`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        friendly_name: friendlyName,
        factor_type: 'totp'
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'Không thể tạo mã 2FA');
    return data; // Chứa id, totp: { secret, qr_code, uri }
  }

  // 6. Xác thực mã 6 số 2FA
  async verifyMFA(factorId, code) {
    // Bước 1: Tạo Challenge
    const challengeRes = await fetch(`${this.url}/auth/v1/factors/${factorId}/challenge`, {
      method: 'POST',
      headers: this.getHeaders(true)
    });
    const challenge = await challengeRes.json();
    if (!challengeRes.ok) throw new Error(challenge.msg || 'Không thể tạo phiên 2FA');

    // Bước 2: Verify Challenge với mã OTP
    const verifyRes = await fetch(`${this.url}/auth/v1/factors/${factorId}/verify`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        challenge_id: challenge.id,
        code: code.trim()
      })
    });
    const result = await verifyRes.json();
    if (!verifyRes.ok) throw new Error(result.msg || 'Mã xác thực không hợp lệ');

    if (result.access_token) {
      this.session = {
        ...this.tempSession,
        ...result,
        user: result.user || this.tempSession?.user || this.session?.user
      };
      this.tempSession = null;
      await chrome.storage.local.set({ supabase_session: this.session });
    }
    return result;
  }

  // 7. Đồng bộ 2 chiều (Sync Vocabularies với 3 trạng thái & cơ chế Xóa chuẩn xác)
  async sync(localVocabularies) {
    if (!this.session?.access_token) throw new Error('Chưa đăng nhập');
    const userId = this.getUserId();
    if (!userId) throw new Error('Không xác định được User ID từ phiên đăng nhập');

    // A. Đọc danh sách các bản ghi đã xóa (Tombstones) từ Local Storage
    const storageData = await chrome.storage.local.get(['deleted_records']);
    let deletedRecords = storageData.deleted_records || [];

    // Nếu có các từ đã bị xóa trước đó (ví dụ xóa lúc offline hoặc chưa sync), gửi lệnh DELETE lên Cloud
    if (deletedRecords.length > 0) {
      await this.deleteWords(deletedRecords).catch(() => {});
    }

    const deletedIdMap = new Set(deletedRecords.map(d => d.id).filter(Boolean));
    const deletedWordMap = new Set(deletedRecords.map(d => (d.word || '').toLowerCase()).filter(Boolean));

    // B. Lấy toàn bộ từ vựng từ Cloud
    const getRes = await fetch(`${this.url}/rest/v1/vocabularies?select=*`, {
      headers: this.getHeaders(true)
    });
    if (!getRes.ok) {
      const err = await getRes.json().catch(() => ({}));
      throw new Error(err.message || err.hint || `Lỗi (${getRes.status}) khi tải từ vựng từ đám mây`);
    }
    const rawRemoteList = await getRes.json();

    // Lọc bỏ ngay các từ đang nằm trong danh sách đã xóa để tuyệt đối không kéo về lại
    const remoteList = rawRemoteList.filter(r => 
      !deletedIdMap.has(r.id) && !deletedWordMap.has((r.word || '').toLowerCase())
    );

    // C. Merge logic: Phân loại 3 trạng thái (Local mới, Đồng bộ lên, Đồng bộ xuống, và Xóa)
    const remoteMap = new Map();
    remoteList.forEach(r => remoteMap.set(r.word.toLowerCase(), r));

    const finalMergedList = [];
    const itemsToUpsert = [];
    let uploadedCount = 0;
    let downloadedCount = 0;
    let deletedCount = 0;

    // 1. Duyệt qua từng từ ở local
    for (const local of localVocabularies) {
      const cleanWord = (local.word || '').toLowerCase();

      // Nếu từ này đã bị đánh dấu xóa trên máy này: bỏ qua hoàn toàn
      if (deletedIdMap.has(local.id) || deletedWordMap.has(cleanWord)) {
        deletedCount++;
        continue;
      }

      const remote = remoteMap.get(cleanWord);

      if (!remote) {
        // Từ này hiện KHÔNG còn trên Cloud.
        // Kiểm tra xem từ này đã từng được đồng bộ lên Cloud trước đây hay chưa:
        if (local.syncedWithCloud) {
          // Trạng thái: Đã từng đồng bộ nhưng trên Cloud đã bị xóa (do người dùng xóa từ trình duyệt khác hoặc trên Cloud)
          // -> Đồng bộ thao tác xóa xuống local luôn, không hồi sinh, không upload lại!
          deletedCount++;
          deletedRecords.push({ id: local.id, word: cleanWord, deletedAt: new Date().toISOString() });
          continue;
        }

        // Trạng thái 1: Dữ liệu Local mới tạo trên thiết bị này -> Cần Đồng bộ lên (Upload)
        uploadedCount++;
        itemsToUpsert.push({
          id: local.id,
          user_id: userId,
          word: local.word,
          phonetic: local.phonetic || '',
          part_of_speech: local.partOfSpeech || '',
          vietnamese_meaning: local.vietnameseMeaning || '',
          english_meaning: local.englishMeaning || '',
          context_sentence: local.contextSentence || '',
          audio_url: local.audioUrl || '',
          source_url: local.sourceUrl || '',
          source_title: local.sourceTitle || '',
          status: local.status || 'learning',
          tags: local.tags || [],
          date_added: local.dateAdded || new Date().toISOString(),
          last_reviewed: local.lastReviewed || null,
          updated_at: local.updatedAt || new Date().toISOString()
        });
        finalMergedList.push({
          ...local,
          syncedWithCloud: true
        });
      } else {
        // Từ có ở cả local và cloud: So sánh timestamp cập nhật (Last-Write-Wins)
        const localTime = new Date(local.updatedAt || local.lastReviewed || local.dateAdded || 0).getTime();
        const remoteTime = new Date(remote.updated_at || remote.last_reviewed || remote.date_added || 0).getTime();

        if (remoteTime > localTime) {
          // Trạng thái 2: Cloud mới hơn Local -> Đồng bộ xuống (Download)
          downloadedCount++;
          finalMergedList.push({
            id: remote.id,
            word: remote.word,
            phonetic: remote.phonetic || local.phonetic || '',
            partOfSpeech: remote.part_of_speech || local.partOfSpeech || '',
            vietnameseMeaning: remote.vietnamese_meaning || local.vietnameseMeaning || '',
            englishMeaning: remote.english_meaning || local.englishMeaning || '',
            contextSentence: remote.context_sentence || local.contextSentence || '',
            audioUrl: remote.audio_url || local.audioUrl || '',
            sourceUrl: remote.source_url || local.sourceUrl || '',
            sourceTitle: remote.source_title || local.sourceTitle || '',
            status: remote.status || 'learning',
            tags: remote.tags || local.tags || [],
            dateAdded: remote.date_added || local.dateAdded || new Date().toISOString(),
            lastReviewed: remote.last_reviewed || local.lastReviewed || null,
            updatedAt: remote.updated_at,
            syncedWithCloud: true
          });
        } else if (localTime > remoteTime) {
          // Trạng thái 3: Local mới hơn Cloud -> Đồng bộ lên (Upload)
          uploadedCount++;
          const updatedIso = local.updatedAt || new Date().toISOString();
          itemsToUpsert.push({
            id: remote.id,
            user_id: userId,
            word: local.word,
            phonetic: local.phonetic || (remote.phonetic || ''),
            part_of_speech: local.partOfSpeech || (remote.part_of_speech || ''),
            vietnamese_meaning: local.vietnameseMeaning || (remote.vietnamese_meaning || ''),
            english_meaning: local.englishMeaning || (remote.english_meaning || ''),
            context_sentence: local.contextSentence || (remote.context_sentence || ''),
            audio_url: local.audioUrl || (remote.audio_url || ''),
            source_url: local.sourceUrl || (remote.source_url || ''),
            source_title: local.sourceTitle || (remote.source_title || ''),
            status: local.status || (remote.status || 'learning'),
            tags: local.tags || (remote.tags || []),
            date_added: remote.date_added || local.dateAdded || new Date().toISOString(),
            last_reviewed: local.lastReviewed || remote.last_reviewed || null,
            updated_at: updatedIso
          });
          finalMergedList.push({
            ...local,
            id: remote.id,
            updatedAt: updatedIso,
            syncedWithCloud: true
          });
        } else {
          // Thời gian bằng nhau -> Ưu tiên trạng thái 'mastered' nếu 1 trong 2 đã học thuộc
          const effectiveStatus = (remote.status === 'mastered' || local.status === 'mastered')
            ? 'mastered'
            : (remote.status || local.status || 'learning');
          const effectiveMeaning = (remote.vietnamese_meaning && remote.vietnamese_meaning.length >= (local.vietnameseMeaning || '').length)
            ? remote.vietnamese_meaning
            : (local.vietnameseMeaning || remote.vietnamese_meaning || '');

          finalMergedList.push({
            id: remote.id,
            word: remote.word,
            phonetic: remote.phonetic || local.phonetic || '',
            partOfSpeech: remote.part_of_speech || local.partOfSpeech || '',
            vietnameseMeaning: effectiveMeaning,
            englishMeaning: remote.english_meaning || local.englishMeaning || '',
            contextSentence: remote.context_sentence || local.contextSentence || '',
            audioUrl: remote.audio_url || local.audioUrl || '',
            sourceUrl: remote.source_url || local.sourceUrl || '',
            sourceTitle: remote.source_title || local.sourceTitle || '',
            status: effectiveStatus,
            tags: remote.tags || local.tags || [],
            dateAdded: remote.date_added || local.dateAdded || new Date().toISOString(),
            lastReviewed: remote.last_reviewed || local.lastReviewed || null,
            updatedAt: remote.updated_at || local.updatedAt || new Date().toISOString(),
            syncedWithCloud: true
          });
        }

        remoteMap.delete(cleanWord);
      }
    }

    // 2. Những từ có trên cloud nhưng chưa có ở local -> Đồng bộ xuống (Download)
    remoteMap.forEach(remote => {
      if (deletedIdMap.has(remote.id) || deletedWordMap.has((remote.word || '').toLowerCase())) return;

      downloadedCount++;
      finalMergedList.unshift({
        id: remote.id,
        word: remote.word,
        phonetic: remote.phonetic || '',
        partOfSpeech: remote.part_of_speech || '',
        vietnameseMeaning: remote.vietnamese_meaning || '',
        englishMeaning: remote.english_meaning || '',
        contextSentence: remote.context_sentence || '',
        audioUrl: remote.audio_url || '',
        sourceUrl: remote.source_url || '',
        sourceTitle: remote.source_title || '',
        status: remote.status || 'learning',
        tags: remote.tags || [],
        dateAdded: remote.date_added || new Date().toISOString(),
        lastReviewed: remote.last_reviewed || null,
        updatedAt: remote.updated_at,
        syncedWithCloud: true
      });
    });

    // D. Đẩy danh sách local lên Supabase (Batch Upsert)
    if (itemsToUpsert.length > 0) {
      const upsertRes = await fetch(`${this.url}/rest/v1/vocabularies?on_conflict=id`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(true),
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(itemsToUpsert)
      });
      if (!upsertRes.ok) {
        const err = await upsertRes.json().catch(() => ({}));
        throw new Error(err.message || err.hint || `Lỗi (${upsertRes.status}) khi cập nhật dữ liệu lên đám mây`);
      }
    }

    // Cập nhật lại danh sách tombstones gọn gàng (tối đa 300)
    await chrome.storage.local.set({ deleted_records: deletedRecords.slice(-300) });

    // Đính kèm số liệu thống kê vào mảng kết quả
    finalMergedList.uploadedCount = uploadedCount;
    finalMergedList.downloadedCount = downloadedCount;
    finalMergedList.deletedCount = deletedCount;

    return finalMergedList;
  }
}

// Export instance
window.supabaseSync = new SupabaseSync();
