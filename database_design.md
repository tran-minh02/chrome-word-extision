# Thiết Kế Cơ Sở Dữ Liệu Đồng Bộ Từ Vựng (Supabase / PostgreSQL)

## 1. Bảng `vocabularies`

Lưu trữ toàn bộ danh sách từ vựng của từng người dùng, hỗ trợ đồng bộ 2 chiều (upsert) với Chrome Extension.

```sql
-- Kích hoạt extension pgcrypto/uuid-ossp (có sẵn trên Supabase)
create extension if not exists "pgcrypto";

-- Bảng lưu trữ từ vựng
create table public.vocabularies (
    id text primary key,                                   -- Giữ nguyên ID từ client (e.g. vocab_171...) hoặc sinh UUID
    user_id uuid not null references auth.users(id) on delete cascade,
    word text not null,                                    -- Từ tiếng Anh
    phonetic text default '',                              -- Phiên âm IPA
    part_of_speech text default '',                        -- Từ loại (noun, verb...)
    vietnamese_meaning text default '',                    -- Nghĩa tiếng Việt
    english_meaning text default '',                       -- Định nghĩa tiếng Anh
    context_sentence text default '',                      -- Câu ví dụ/ngữ cảnh khi bôi đen
    audio_url text default '',                             -- Link phát âm mp3
    source_url text default '',                            -- URL bài viết lưu từ
    source_title text default '',                          -- Tiêu đề tab web
    status text not null default 'learning' 
        check (status in ('learning', 'mastered')),        -- Trạng thái học
    tags text[] default '{}',                              -- Nhãn phân loại
    date_added timestamptz default timezone('utc'::text, now()),
    last_reviewed timestamptz,
    updated_at timestamptz default timezone('utc'::text, now())
);

-- Không cho phép trùng từ trên cùng 1 tài khoản (hỗ trợ ON CONFLICT DO UPDATE khi sync)
create unique index idx_vocab_user_word on public.vocabularies (user_id, lower(word));

-- Index tăng tốc truy vấn khi lọc danh sách
create index idx_vocab_user_status on public.vocabularies (user_id, status);
create index idx_vocab_user_updated on public.vocabularies (user_id, updated_at desc);

-- Tự động cập nhật `updated_at` mỗi khi bản ghi thay đổi
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger trigger_vocab_updated_at
    before update on public.vocabularies
    for each row
    execute function update_updated_at_column();
```

---

## 2. Phân Quyền Bảo Mật (Row Level Security - RLS)

Đảm bảo người dùng chỉ có quyền thao tác trên dữ liệu của chính mình.

```sql
-- Bật RLS
alter table public.vocabularies enable row level security;

-- Policy: Chỉ xem từ vựng của chính mình
create policy "Users can view their own vocabularies"
    on public.vocabularies for select
    using (auth.uid() = user_id);

-- Policy: Chỉ chèn từ vựng vào tài khoản của mình
create policy "Users can insert their own vocabularies"
    on public.vocabularies for insert
    with check (auth.uid() = user_id);

-- Policy: Chỉ cập nhật từ vựng của mình
create policy "Users can update their own vocabularies"
    on public.vocabularies for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policy: Chỉ xóa từ vựng của mình
create policy "Users can delete their own vocabularies"
    on public.vocabularies for delete
    using (auth.uid() = user_id);
```

---

## 3. Quy Ước Ánh Xạ Dữ Liệu (Local ⇄ Cloud Sync)

| Client (`chrome.storage.local`) | Database (`public.vocabularies`) | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `TEXT` | Giữ nguyên ID local tránh đụng độ sync |
| — | `user_id` | `UUID` | Lấy từ `auth.uid()` của user đăng nhập |
| `word` | `word` | `TEXT` | Bắt buộc |
| `phonetic` | `phonetic` | `TEXT` | |
| `partOfSpeech` | `part_of_speech` | `TEXT` | Snake_case trên database |
| `vietnameseMeaning` | `vietnamese_meaning` | `TEXT` | |
| `englishMeaning` | `english_meaning` | `TEXT` | |
| `contextSentence` | `context_sentence` | `TEXT` | |
| `audioUrl` | `audio_url` | `TEXT` | |
| `sourceUrl` | `source_url` | `TEXT` | |
| `sourceTitle` | `source_title` | `TEXT` | |
| `status` | `status` | `TEXT` | `'learning'` hoặc `'mastered'` |
| `tags` | `tags` | `TEXT[]` | Mảng chuỗi tag |
| `dateAdded` | `date_added` | `TIMESTAMPTZ` | |
| `lastReviewed` | `last_reviewed` | `TIMESTAMPTZ` | |
| — | `updated_at` | `TIMESTAMPTZ` | Dùng để resolve conflict (Last Write Wins) |
