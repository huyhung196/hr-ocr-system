"""
LLM Service - Groq API wrapper để phân loại tài liệu nhân sự.
Dùng Qwen (hoặc các model khác) qua Groq API miễn phí.

Xử lý rate_limit_exceeded:
- Retry tự động với exponential backoff (tối đa 3 lần)
- Fallback sang model dự phòng nếu model chính bị rate limit
- Truncate text OCR để giảm input tokens
"""
import json
import re
import time
from app.core.config import settings

# Lazy-load Groq client
_groq_client = None

# Model fallback theo thứ tự ưu tiên
FALLBACK_MODELS = [
    "qwen/qwen3-32b",
    "qwen/qwen3.6-27b",
    "llama-3.3-70b-versatile",  # fallback cuối nếu Qwen đều bị rate limit
]

# Giới hạn độ dài text OCR để tránh vượt quota tokens (giảm từ 3000 -> 1500 để fit 6k TPM)
MAX_OCR_CHARS = 1500


def get_groq_client():
    """Khởi tạo Groq client (lazy singleton)."""
    global _groq_client
    if _groq_client is None:
        try:
            from groq import Groq
            _groq_client = Groq(api_key=settings.GROQ_API_KEY)
        except ImportError:
            raise ImportError("Package 'groq' chưa được cài. Chạy: pip install groq")
    return _groq_client


def truncate_text(text: str, max_chars: int = MAX_OCR_CHARS) -> str:
    """Cắt bớt text OCR nếu quá dài để tiết kiệm tokens."""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    print(f"[Groq] Text OCR đã bị truncate: {len(text)} -> {max_chars} ký tự")
    return truncated


def build_classification_prompt(text: str, rules: list, employees: list) -> tuple:
    """
    Tạo system prompt và user prompt để phân loại tài liệu.

    Returns:
        (system_prompt, user_prompt)
    """
    # Truncate text để giảm tokens
    text = truncate_text(text)

    # Định dạng danh sách loại văn bản
    doc_rules_list = []
    for r in rules:
        rule_desc = f"- Mã viết tắt: {r['doc_type']} | Tên loại: {r['keyword']}"
        if r.get('required_phrases'):
            rule_desc += f" | Cụm từ bắt buộc (phân tách bởi | hoặc ;): {r['required_phrases']}"
        if r.get('excluded_phrases'):
            rule_desc += f" | Cụm từ loại trừ (phân tách bởi | hoặc ;): {r['excluded_phrases']}"
        doc_rules_list.append(rule_desc)

    doc_types_str = "\n".join(doc_rules_list)

    # (Tối ưu Token) KHÔNG truyền danh sách nhân viên vào LLM nữa.
    # Để LLM tự trích xuất tên hoặc mã từ văn bản, sau đó python code sẽ tự đối chiếu.

    system_prompt = (
        "Bạn là trợ lý AI chuyên nghiệp phân loại tài liệu nhân sự và trích xuất thông tin cho công ty.\n"
        "Nhiệm vụ của bạn là đọc đoạn văn bản trích xuất từ OCR của tài liệu và xác định:\n"
        "1. Loại văn bản (doc_type): Thuộc danh sách mã viết tắt được cung cấp dưới đây.\n"
        "2. Tên nhân viên và Mã nhân viên (nếu có) được nhắc đến trong văn bản.\n"
        "3. Các thông tin bổ sung: Số văn bản, Ngày tháng văn bản, Kỳ lương/Kỳ bảo hiểm, và Chi tiết nội dung.\n\n"
        "QUY TẮC PHÂN LOẠI QUAN TRỌNG (BẮT BUỘC TUÂN THỦ):\n"
        "- Với mỗi mã loại văn bản, văn bản OCR CẦN chứa ít nhất một trong các 'Cụm từ bắt buộc' (nếu có).\n"
        "- Nếu văn bản chứa 'Cụm từ loại trừ' nào của loại đó, tuyệt đối KHÔNG phân loại vào loại này.\n"
        "Ví dụ: Nếu có 'phụ lục hợp đồng', phân loại là PLHĐ chứ không phải HĐLĐ.\n\n"
        "QUY TẮC TRÍCH XUẤT THÔNG TIN BỔ SUNG:\n"
        "- document_number: Số quyết định, hợp đồng, biên bản (VD: '80/2021/TT-BTC', '01/QĐ-BN').\n"
        "- document_date: Ngày ký/ban hành dưới định dạng DDMMYYYY (VD: '18062021'). Nếu chỉ có tháng/năm thì lấy MMYYYY (VD: '122024').\n"
        "- period: Kỳ lương, kê khai thuế, bảo hiểm dạng MMYYYY hoặc YYYY.\n"
        "- detail_text: Tên phúc lợi, chế độ bảo hiểm (VD: 'omdau', 'thaisan'), chức danh, v.v.\n\n"
        "Dưới đây là danh sách loại văn bản và quy định cụm từ:\n"
        f"{doc_types_str}\n\n"
        "QUAN TRỌNG: Chỉ trả về JSON thuần túy, không có markdown, không giải thích.\n"
        "Định dạng JSON:\n"
        "{\n"
        "  \"doc_type\": \"<Mã viết tắt hoặc null>\",\n"
        "  \"raw_employee_name\": \"<Tên đầy đủ của nhân viên trích xuất được hoặc null>\",\n"
        "  \"raw_employee_code\": \"<Mã nhân viên trích xuất được (VD: NV001) hoặc null>\",\n"
        "  \"document_number\": \"<Số văn bản hoặc null>\",\n"
        "  \"document_date\": \"<Ngày văn bản dạng DDMMYYYY hoặc null>\",\n"
        "  \"period\": \"<Kỳ thời gian dạng MMYYYY hoặc null>\",\n"
        "  \"detail_text\": \"<Chi tiết nội dung hoặc null>\",\n"
        "  \"reason\": \"<Lý do ngắn gọn>\"\n"
        "}"
    )

    user_prompt = f"Đoạn văn bản trích xuất từ tài liệu:\n\n{text}"

    return system_prompt, user_prompt


def _call_groq(model: str, system_prompt: str, user_prompt: str) -> str:
    """
    Gọi Groq API với một model cụ thể.
    Raise exception nếu thất bại.
    """
    client = get_groq_client()
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0,
            max_tokens=2048,  # Tăng lên 2048 để model có đủ token hoàn thành thẻ <think> và trả về JSON hợp lệ
            response_format={"type": "json_object"},
        )
    except Exception as e:
        # Fallback không dùng json_object nếu model không hỗ trợ
        err_str = str(e)
        if "json_object" in err_str or "response_format" in err_str:
            print(f"[Groq] json_object không hỗ trợ, thử plain text...")
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0,
                max_tokens=2048,
            )
        else:
            raise

    raw = completion.choices[0].message.content.strip()
    # Strip thẻ <think>...</think> nếu model trả về (Qwen3 thinking mode)
    raw = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL).strip()
    # Strip markdown code blocks
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if len(lines) > 2 else raw
    return raw


def classify_document_groq(text: str, rules: list, employees: list):
    """
    Gọi Groq API với model Qwen để phân loại tài liệu.
    Tự động retry và fallback sang model khác nếu bị rate limit.

    Args:
        text: Văn bản OCR cần phân loại
        rules: Danh sách quy tắc phân loại từ DB
        employees: Danh sách nhân viên từ DB

    Returns:
        dict hoặc None nếu thất bại hoàn toàn.
    """
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
        print("[Groq] GROQ_API_KEY chưa được cấu hình.")
        return None

    system_prompt, user_prompt = build_classification_prompt(text, rules, employees)

    # Danh sách model sẽ thử theo thứ tự
    primary_model = settings.GROQ_MODEL or "qwen/qwen3-32b"
    models_to_try = [primary_model] + [m for m in FALLBACK_MODELS if m != primary_model]

    for model in models_to_try:
        # Retry tối đa 3 lần cho mỗi model với exponential backoff
        for attempt in range(3):
            try:
                print(f"[Groq] Gọi model={model}, attempt={attempt + 1}")
                raw_content = _call_groq(model, system_prompt, user_prompt)
                result = json.loads(raw_content)
                print(f"[Groq] Thành công với model={model}")
                return result

            except json.JSONDecodeError as e:
                print(f"[Groq] Lỗi parse JSON (model={model}): {e}")
                break  # Lỗi JSON không retry, thử model khác

            except Exception as e:
                err_str = str(e).lower()
                is_rate_limit = "rate_limit" in err_str or "429" in err_str or "413" in err_str
                is_model_error = "decommissioned" in err_str or "model_not_found" in err_str

                if is_model_error:
                    print(f"[Groq] Model {model} không tồn tại/đã khai tử. Thử model khác.")
                    break  # Không retry, thử model khác ngay

                if is_rate_limit:
                    wait_sec = (2 ** attempt) * 5  # 5s, 10s, 20s
                    print(f"[Groq] Rate limit model={model}. Chờ {wait_sec}s rồi retry...")
                    time.sleep(wait_sec)
                    if attempt == 2:
                        print(f"[Groq] Hết retry cho model={model}. Thử model khác.")
                        break
                else:
                    print(f"[Groq] Lỗi không xác định (model={model}): {e}")
                    break  # Lỗi khác, thử model tiếp theo

    print("[Groq] Tất cả model đều thất bại. Dùng rule-based fallback.")
    return None
