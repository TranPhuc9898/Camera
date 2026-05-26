# Nguyên Tắc Code Karpathy (Karpathy Coding Principles)

Bộ nguyên tắc giảm lỗi thường gặp khi LLM viết code, dựa trên quan sát của Andrej Karpathy.
Nguồn: https://github.com/forrestchang/andrej-karpathy-skills

**Trade-off:** Các nguyên tắc này ưu tiên CẨN TRỌNG hơn TỐC ĐỘ. Với task quá đơn giản (typo, one-liner), tự dùng phán đoán — không cần áp full rigor.

## 1. Suy Nghĩ Trước Khi Code (Think Before Coding)

**KHÔNG đoán mò. KHÔNG giấu sự bối rối. PHẢI nêu rõ trade-offs.**

Trước khi implement:

- **Nêu rõ giả định** — Nếu không chắc, HỎI lại thay vì đoán
- **Có nhiều cách hiểu?** — Trình bày tất cả, KHÔNG chọn ngầm
- **Có cách đơn giản hơn?** — Nói ra. Push back khi cần thiết
- **Có gì chưa rõ?** — DỪNG lại. Chỉ tên rõ ràng phần khó hiểu. HỎI

## 2. Đơn Giản Là Trên Hết (Simplicity First)

**Code tối thiểu để giải quyết vấn đề. KHÔNG suy diễn thêm.**

- KHÔNG thêm tính năng ngoài yêu cầu
- KHÔNG abstraction cho code chỉ dùng 1 lần
- KHÔNG "flexibility" / "configurability" nếu không được yêu cầu
- KHÔNG xử lý error cho tình huống KHÔNG THỂ XẢY RA
- Viết 200 dòng nhưng có thể viết 50 → REWRITE

**Tự kiểm tra:** _"Senior engineer có nói code này quá phức tạp không?"_ — Nếu CÓ, đơn giản hóa.

## 3. Sửa Chữa Có Phẫu Thuật (Surgical Changes)

**CHỈ sửa cái PHẢI sửa. CHỈ dọn sạch mớ rối do MÌNH gây ra.**

Khi sửa code có sẵn:

- KHÔNG "cải thiện" code/comment/format xung quanh
- KHÔNG refactor những thứ không hỏng
- Match style hiện tại, dù mình làm khác sẽ tốt hơn
- Phát hiện dead code không liên quan → NÓI cho user, ĐỪNG xoá

Khi thay đổi tạo ra "code mồ côi":

- XOÁ imports/variables/functions BỊ MÌNH làm thành unused
- KHÔNG xoá pre-existing dead code trừ khi được yêu cầu

**Bài kiểm tra:** _Mỗi dòng thay đổi phải truy được TRỰC TIẾP về yêu cầu của user._

## 4. Thực Thi Hướng Mục Tiêu (Goal-Driven Execution)

**Xác định tiêu chí THÀNH CÔNG. Loop đến khi VERIFIED.**

Biến task thành goal kiểm chứng được:

- "Thêm validation" → "Viết test cho input invalid, rồi làm pass"
- "Fix bug" → "Viết test reproduce bug, rồi làm pass"
- "Refactor X" → "Đảm bảo tests PASS cả TRƯỚC và SAU"

Task nhiều bước → state plan ngắn:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

→ Tiêu chí MẠNH: LLM tự loop độc lập. Tiêu chí YẾU ("make it work"): phải hỏi liên tục.

---

**Dấu hiệu các nguyên tắc này đang hoạt động:**

- Diffs **ÍT thay đổi** không cần thiết
- **ÍT phải rewrite** vì over-complicate
- Câu hỏi clarify đến **TRƯỚC khi implement**, không phải SAU khi mistake

---

## Tích Hợp Karpathy × Skill `u-*`

**Nguyên tắc Karpathy KHÔNG thay thế skill `u-*` — chúng là GATE KIỂM TRA tại từng phase.**

### Mapping: Nguyên tắc → Skill chịu trách nhiệm

| Nguyên tắc Karpathy          | Skill enforce                               | Kiểm tra cụ thể                                  |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------ |
| **1. Think Before Coding**   | `u-ask`, `u-task` (Phase Analyze/Plan)      | Đã state assumptions? Đã hỏi clarify?            |
| **2. Simplicity First**      | `u-task` (Phase Plan), `u-refactor`         | 200 dòng có thành 50 không? Có abstraction thừa? |
| **3. Surgical Changes**      | `u-task`, `u-fix-bug`, `u-review`           | Mỗi diff line có trace về user request?          |
| **4. Goal-Driven Execution** | `u-task` (Verify), `u-testing`, `u-fix-bug` | Có success criteria kiểm chứng được?             |

### Quy Trình Tích Hợp Theo Loại Task

#### Task ĐƠN GIẢN (typo, one-liner, rename)

→ Sửa trực tiếp. **BỎ QUA** Karpathy rigor (per trade-off rule).

#### Task BUG FIX

```
u-fix-bug — classify → trace root cause
   ↓
[Karpathy Gate: VIẾT TEST REPRODUCE TRƯỚC]   ← Goal-Driven
   ↓
u-fix-bug — minimal fix (apply Surgical Changes)  ← Chỉ sửa cái gây bug
   ↓
u-testing — verify test pass (regression)
   ↓
u-review — check 4 nguyên tắc
```

#### Task FEATURE MỚI

```
u-ask (optional: explore options)
   ↓
[Karpathy Gate: STATE ASSUMPTIONS, PUSH BACK nếu phức tạp]
   ↓
"Anh cảm thấy ổn áp không? Em code nhé."
   ↓
u-task — Phase Plan
   ↓
[Karpathy Gate: DEFINE SUCCESS CRITERIA verifiable]
   ↓
u-task — Phase Execute (Plop scaffold → fill layers)
   ↓
[Karpathy Gate: SIMPLICITY + SURGICAL]
   ↓
u-task Verify → u-testing → u-review → u-finalize
```

### Gates Bắt Buộc (Self-Check Trước Khi Tiếp Tục)

**Trước khi Execute (`u-task` Phase Execute):**

- [ ] Đã nêu rõ assumptions của task?
- [ ] Có success criteria kiểm chứng được (không chỉ "make it work")?
- [ ] Plan có simpler alternative nào không?

**Trong khi Execute:**

- [ ] Có đang drive-by refactor code không liên quan?
- [ ] Có đang thêm abstraction "phòng khi cần"?
- [ ] Có đang thêm error handling cho case không thể xảy ra?

**Sau khi Execute, trước `u-review`:**

- [ ] Mỗi changed line có trace TRỰC TIẾP về user request?
- [ ] Code có thể viết ngắn hơn không (200→50 test)?
- [ ] Test verify được success criteria đã define ban đầu?

### Xử Lý Conflict Giữa Rules Cũ và Karpathy

| Conflict                                                                           | Resolution                                                                   |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Rules nói "file >200 dòng → modularize" vs Karpathy "đừng refactor cái không hỏng" | **Modularize CHỈ KHI** đang chạm vào file đó cho task chính. KHÔNG drive-by. |
| `u-task` Verify (typecheck/lint) vs Simplicity First                               | Verify là gate chất lượng bắt buộc → **GIỮ NGUYÊN**, không bị ảnh hưởng      |
| Sửa trực tiếp vs Goal-Driven test-first                                            | Bug fix → test-first BẮT BUỘC. Feature mới → plan trước, test-first OPTIONAL |
