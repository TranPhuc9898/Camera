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

## Tích Hợp Karpathy × Claudekit (`/ck:*`)

**Nguyên tắc Karpathy KHÔNG thay thế claudekit — chúng là GATE KIỂM TRA tại từng skill.**

### Mapping: Nguyên tắc → Skill chịu trách nhiệm

| Nguyên tắc Karpathy          | Skill enforce                                       | Kiểm tra cụ thể                                  |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| **1. Think Before Coding**   | `/ck:brainstorm`, `/ck:scout`, `/ck:plan`           | Đã state assumptions? Đã hỏi clarify?            |
| **2. Simplicity First**      | `/ck:plan`, `/ck:cook`, `/ck:simplify`              | 200 dòng có thành 50 không? Có abstraction thừa? |
| **3. Surgical Changes**      | `/ck:cook`, `/ck:fix`, `/ck:code-review`            | Mỗi diff line có trace về user request?          |
| **4. Goal-Driven Execution** | `/ck:plan` (define), `/ck:test` (verify), `/ck:fix` | Có success criteria kiểm chứng được?             |

### Quy Trình Tích Hợp Theo Loại Task

#### Task ĐƠN GIẢN (typo, one-liner, rename)

→ `/cook` trực tiếp. **BỎ QUA** Karpathy rigor (per trade-off rule).

#### Task BUG FIX

```
/ck:scout (tìm root cause)
   ↓
/ck:debug (phân tích)
   ↓
[Karpathy Gate: VIẾT TEST REPRODUCE TRƯỚC]  ← Goal-Driven
   ↓
/ck:fix (apply Surgical Changes)             ← Chỉ sửa cái gây bug
   ↓
/ck:test (verify test pass)
   ↓
/ck:code-review (check 4 nguyên tắc)
```

#### Task FEATURE MỚI

```
/ck:brainstorm
   ↓
[Karpathy Gate: STATE ASSUMPTIONS, PUSH BACK nếu phức tạp]
   ↓
"Anh cảm thấy ổn áp không? Em code nhé."
   ↓
/ck:plan
   ↓
[Karpathy Gate: DEFINE SUCCESS CRITERIA verifiable]
   ↓
/ck:cook
   ↓
[Karpathy Gate: SIMPLICITY + SURGICAL]
   ↓
/ck:test → /ck:code-review → /ck:ship → /ck:journal
```

### Gates Bắt Buộc (Self-Check Trước Khi Tiếp Tục)

**Trước khi `/ck:cook`:**

- [ ] Đã nêu rõ assumptions của task?
- [ ] Có success criteria kiểm chứng được (không chỉ "make it work")?
- [ ] Plan có simpler alternative nào không?

**Trong khi `/ck:cook`:**

- [ ] Có đang drive-by refactor code không liên quan?
- [ ] Có đang thêm abstraction "phòng khi cần"?
- [ ] Có đang thêm error handling cho case không thể xảy ra?

**Sau khi `/ck:cook`, trước `/ck:code-review`:**

- [ ] Mỗi changed line có trace TRỰC TIẾP về user request?
- [ ] Code có thể viết ngắn hơn không (200→50 test)?
- [ ] Test verify được success criteria đã define ban đầu?

### Xử Lý Conflict Giữa Rules Cũ và Karpathy

| Conflict                                                                               | Resolution                                                                        |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Claudekit nói "file >200 dòng → modularize" vs Karpathy "đừng refactor cái không hỏng" | **Modularize CHỈ KHI** đang chạm vào file đó cho task chính. KHÔNG drive-by.      |
| Pipeline Visibility (`> /ck:* đang chạy`) vs Simplicity First                          | Pipeline Visibility là về UX của user → **GIỮ NGUYÊN**, không bị ảnh hưởng        |
| `/cook` direct vs Goal-Driven test-first                                               | Bug fix → test-first BẮT BUỘC. Feature mới → spec/plan trước, test-first OPTIONAL |
