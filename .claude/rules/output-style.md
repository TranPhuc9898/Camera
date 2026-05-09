---
paths:
  - '**'
---

# Output Style

## Ngôn Ngữ (Language)

- **Luôn trả lời bằng tiếng Việt** — tiết kiệm token, không cần translate từ English
- Code comments và technical terms giữ nguyên tiếng Anh
- Viết đầy đủ dấu tiếng Việt

## Communication

- **Không narration trung gian.** Giữa tool calls: chỉ output blocker hoặc decision cho user.
- **Một recommendation.** Chọn một option với one-line reason — không list pros/cons open-ended.
- **One-sentence milestones.** Tìm được root cause / đổi hướng / gặp blocker → một câu, rồi tiếp tục.

## Chống Hallucination

Trước khi reference bất kỳ API, method, hoặc file: `grep -rn 'Name' src/ app/` hoặc `Glob` path. KHÔNG bịa signature — đọc source. Nếu không verify được, nói rõ.

Pattern KHÔNG được catch bởi `expo-rn.md` — flag ngay nếu thấy trong diff:

| ❌ Sai                                    | ✅ Đúng                                    |
| ----------------------------------------- | ------------------------------------------ |
| `new MMKV(...)` (v3 API)                  | `createMMKV({...})` (v4 Nitro Modules API) |
| `storage.delete(key)`                     | `storage.remove(key)`                      |
| `import { ... } from '../../lib/...'`     | path alias `@/lib/...`                     |
| `useState` cho server data                | TanStack `useQuery`                        |
| `useState` cho global app state           | Zustand store                              |
| inline `style={{...}}` cho static styling | NativeWind `className="..."`               |

## Template Báo Cáo

### Audit Report — accessibility, performance, security, skill-review

```
━━━ [LOẠI BÁO CÁO] ━━━━━━━━━━━━━━━━━━━━━━━━
🔴 Critical   · file:L — mô tả ngắn
🟠 High       · file:L — mô tả ngắn
🟡 Medium     · file:L — mô tả ngắn
⚪ Nit        · file:L — mô tả ngắn
━━━ [N] findings · PASS / NEEDS FIXES / BLOCKED ━━━
```

**PASS** = 0 critical & 0 high · **NEEDS FIXES** = 0 critical, ≥1 high hoặc medium · **BLOCKED** = ≥1 critical

### Outcome Report — finalize, fix-bug, review

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VERB  [hoặc]  ❌ VERB — [blocker ≤5 từ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[skill-specific sections]

Issues:
    🔴 · file:L — critical
    🟠 · file:L — warning
    🟡 · file:L — suggestion
    ⚪ · file:L — nit
    [✅ Không có]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Bỏ qua severity rows trống. File paths: `src/...` hoặc `app/...` (không relative).

## Color Coding Convention (Karpathy × Claudekit)

**Mục đích:** Dùng `diff` block để phân biệt nhanh hệ nào đang hoạt động trong workflow.

**Bảng màu (gradient 135deg):**

```
#89d4ff (xanh nhạt) → #ae81ff (tím) → #ff79c6 (hồng) → #ffb86c (cam) → #89d4ff
```

**Mapping màu → marker:**

| Màu              | Marker      | Render      | Dùng cho                        |
| ---------------- | ----------- | ----------- | ------------------------------- |
| `#ae81ff` (tím)  | `@@ ... @@` | Tím/magenta | **KARPATHY** principles & gates |
| `#ffb86c` (cam)  | `! ...`     | Vàng/cam    | **CLAUDEKIT** `/ck:*` đang chạy |
| `#89d4ff` (xanh) | `# ...`     | Xám/cyan    | Info / Note phụ                 |
| `#ff79c6` (hồng) | `- ...`     | Đỏ/hồng     | Warning / Blocker / Fail        |
| (xanh lá)        | `+ ...`     | Xanh        | Done / Success / Pass           |

**Template workflow:**

```diff
@@ KARPATHY GATE: [tên gate] @@
@@ → [check 1]
@@ → [check 2]

! CLAUDEKIT: /ck:[skill] đang chạy...
! → [output ngắn]

+ DONE: [kết quả]
- BLOCKER: [vấn đề nếu có]
# [Info bổ sung]
```

**Quy tắc:**

1. **CHỈ dùng** khi chạy workflow Karpathy × Claudekit (brainstorm/plan/cook/test/review/ship)
2. **KHÔNG lạm dụng** cho chat hỏi đáp thông thường
3. **`@@ KARPATHY @@` lên TRƯỚC `! CLAUDEKIT`** — Karpathy là gate, Claudekit là execution
4. **Mỗi diff block ≤15 dòng** — dài quá thì split
