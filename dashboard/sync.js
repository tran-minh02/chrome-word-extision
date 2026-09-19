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

  // 7. Đồng bộ 2 chiều (Sync Vocabularies)
  async sync(localVocabularies) {
    if (!this.session?.access_token) throw new Error('Chưa đăng nhập');
    const userId = this.getUserId();
    if (!userId) throw new Error('Không xác định được User ID từ phiên đăng nhập');

    // A. Lấy toàn bộ từ vựng từ Cloud
    const getRes = await fetch(`${this.url}/rest/v1/vocabularies?select=*`, {
      headers: this.getHeaders(true)
    });
    if (!getRes.ok) {
      const err = await getRes.json().catch(() => ({}));
      throw new Error(err.message || err.hint || `Lỗi (${getRes.status}) khi tải từ vựng từ đám mây`);
    }
    const remoteList = await getRes.json();

    // B. Merge logic (gộp từ theo word)
    const remoteMap = new Map();
    remoteList.forEach(r => remoteMap.set(r.word.toLowerCase(), r));

    const mergedList = [...localVocabularies];
    const itemsToUpsert = [];

    // Duyệt local đưa lên cloud
    mergedList.forEach(local => {
      const remote = remoteMap.get(local.word.toLowerCase());
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
        last_reviewed: local.lastReviewed || null
      });
      if (remote) remoteMap.delete(local.word.toLowerCase());
    });

    // Những từ có trên cloud nhưng chưa có ở local -> thêm vào local
    remoteMap.forEach(remote => {
      mergedList.unshift({
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
        lastReviewed: remote.last_reviewed || null
      });
    });

    // C. Đẩy danh sách local lên Supabase (Batch Upsert)
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

    return mergedList;
  }
}

// Export instance
window.supabaseSync = new SupabaseSync();
