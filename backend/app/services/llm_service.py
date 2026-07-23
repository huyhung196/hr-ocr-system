"""
LLM Service - Chạy Azure OpenAI
"""
import json
import re
from app.core.config import settings
from openai import AzureOpenAI

# Giới hạn độ dài text OCR để tránh vượt context window
MAX_OCR_CHARS = 6000

def get_azure_client():
    """Khởi tạo Azure OpenAI Client."""
    if not settings.AZURE_OPENAI_API_KEY or not settings.AZURE_OPENAI_ENDPOINT:
        raise ValueError("Chưa cấu hình AZURE_OPENAI_API_KEY hoặc AZURE_OPENAI_ENDPOINT")
        
    client = AzureOpenAI(
        api_key=settings.AZURE_OPENAI_API_KEY,  
        api_version=settings.AZURE_OPENAI_API_VERSION,
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT
    )
    return client

def truncate_text(text: str, max_chars: int = MAX_OCR_CHARS) -> str:
    """Cắt bớt text OCR nếu quá dài."""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    print(f"[Azure OpenAI] Text OCR đã bị truncate: {len(text)} -> {max_chars} ký tự")
    return truncated

def build_classification_prompt(text: str, rules: list, employees: list) -> tuple:
    """Tạo system prompt và user prompt để phân loại tài liệu."""
    text = truncate_text(text)

    doc_rules_list = []
    for i, r in enumerate(rules, 1):
        rule_desc = f"{i}. [{r['doc_type']}] {r['keyword']}"
        if r.get('required_phrases'):
            # Explain AND (;) vs OR (|) logic clearly
            phrases = r['required_phrases']
            if ';' in phrases:
                groups = [g.strip() for g in phrases.split(';') if g.strip()]
                or_parts = []
                for g in groups:
                    if '|' in g:
                        or_parts.append(f"({' HOẶC '.join([w.strip() for w in g.split('|') if w.strip()])})")
                    else:
                        or_parts.append(g)
                rule_desc += f"\n   → Phải chứa TẤT CẢ: {' VÀ '.join(or_parts)}"
            elif '|' in phrases:
                words = [w.strip() for w in phrases.split('|') if w.strip()]
                rule_desc += f"\n   → Phải chứa ÍT NHẤT MỘT: {' HOẶC '.join(words)}"
            else:
                rule_desc += f"\n   → Phải chứa: {phrases.strip()}"
        if r.get('excluded_phrases'):
            phrases = r['excluded_phrases']
            if '|' in phrases:
                words = [w.strip() for w in phrases.split('|') if w.strip()]
                rule_desc += f"\n   → KHÔNG được chứa: {', '.join(words)}"
            else:
                rule_desc += f"\n   → KHÔNG được chứa: {phrases.strip()}"
        doc_rules_list.append(rule_desc)

    doc_types_str = "\n".join(doc_rules_list)

    # Build compact employee list for LLM reference
    emp_lines = []
    for emp in employees:
        parts = [f"Mã:{emp['employee_code']}", f"Tên:{emp['full_name']}"]
        if emp.get('cccd'):
            parts.append(f"CCCD:{emp['cccd']}")
        if emp.get('bhxh'):
            parts.append(f"BHXH:{emp['bhxh']}")
        emp_lines.append(" | ".join(parts))
    emp_list_str = "\n".join(emp_lines)

    system_prompt = (
        "Bạn là trợ lý AI chuyên nghiệp phân loại tài liệu nhân sự và trích xuất thông tin cho công ty.\n"
        "Nhiệm vụ của bạn là đọc đoạn văn bản trích xuất từ OCR của tài liệu và xác định:\n"
        "1. Loại văn bản (doc_type): Thuộc danh sách mã viết tắt được cung cấp dưới đây.\n"
        "2. Tên nhân viên và Mã nhân viên: ĐỐI CHIẾU với danh sách nhân viên cung cấp bên dưới.\n"
        "3. Các thông tin bổ sung: Số văn bản, Ngày tháng văn bản, Kỳ lương/Kỳ bảo hiểm, và Chi tiết nội dung.\n\n"
        "QUY TẮC PHÂN LOẠI VĂN BẢN (BẮT BUỘC TUÂN THỦ THEO THỨ TỰ ƯU TIÊN):\n"
        "- Mỗi loại văn bản có: cụm từ bắt buộc (phải có) và cụm từ loại trừ (không được có).\n"
        "- 'Phải chứa TẤT CẢ' (VÀ): văn bản phải chứa đồng thời TẤT CẢ các nhóm từ liệt kê.\n"
        "- 'Phải chứa ÍT NHẤT MỘT' (HOẶC): văn bản chỉ cần chứa MỘT trong các cụm từ.\n"
        "- 'KHÔNG được chứa': nếu văn bản chứa BẤT KỲ cụm từ loại trừ nào → KHÔNG phân loại vào loại đó.\n"
        "- Ưu tiên loại CỤ THỂ hơn loại CHUNG. VD: 'phụ lục hợp đồng' → PLHĐ (không phải HĐLĐ).\n"
        "- Nếu có nhiều loại khớp, chọn loại có cụm từ bắt buộc khớp chính xác nhất.\n"
        "- Lưu ý text OCR có thể bị lỗi font/thiếu dấu, hãy khớp linh hoạt (VD: 'hop dong' = 'hợp đồng').\n"
        "- Nếu không khớp loại nào, trả doc_type = null.\n\n"
        "QUY TẮC TRÍCH XUẤT NHÂN VIÊN (RẤT QUAN TRỌNG):\n"
        "- Văn bản OCR viết tay thường bị nát bét (VD: 'PHAM.NG VYÊn. Nhà.T.K' hoặc 'Hoàng Nhì Cương Đoan').\n"
        "- Bạn CẦN KẾT HỢP 3 chiến lược sau để đoán tên:\n"
        "  1. Viết tắt/Ký tự đầu: (VD: PHAM.NG VYÊn. Nhà.T.K -> P, N, N, K -> Phạm Nguyễn Nhật Kỳ).\n"
        "  2. Đọc sai do chữ viết tay: (VD: 'Hoàng Nhì Cương Đoan' -> 'Hoàng Vũ Tường Đoan', 'Nguyên' -> 'Nguyễn', 'Tw' -> 'Thị'). Hãy tìm người có cách phát âm hoặc hình dáng chữ viết gần giống nhất.\n"
        "  3. Bị mất chữ cuối: (VD: OCR chỉ đọc được 'Lê Tuị MINH' nhưng trong danh sách có 'Lê Thị Minh Hiếu' là người duy nhất khớp họ và chữ lót -> Chọn Lê Thị Minh Hiếu).\n"
        "- Nếu tìm thấy số CCCD (12 chữ số) hoặc số BHXH (10 chữ số), ưu tiên tuyệt đối theo số này.\n"
        "- Tuyệt đối KHÔNG ĐƯỢC tự chế ra tên sai (như ghép họ người này tên người kia).\n"
        "- TRẢ KẾT QUẢ: raw_employee_code = mã nhân viên TỪ DANH SÁCH, raw_employee_name = tên đầy đủ TỪ DANH SÁCH.\n"
        "- Nếu không thể suy luận chắc chắn ra ai, trả null cho cả 2.\n"
        "- LƯU Ý: Một số nhân viên có mã cũ kết thúc bằng dấu chấm (VD: '1234.'). Giữ nguyên dấu chấm.\n\n"
        "QUY TẮC TRÍCH XUẤT THÔNG TIN BỔ SUNG:\n"
        "- document_number: Số quyết định, hợp đồng, biên bản (VD: '80/2021/TT-BTC', '01/QĐ-BN').\n"
        "- document_date: Ngày ký/ban hành dưới định dạng DDMMYYYY (VD: '18062021'). Nếu chỉ có tháng/năm thì lấy MMYYYY (VD: '122024').\n"
        "- period: Kỳ lương, kê khai thuế, bảo hiểm dạng MMYYYY hoặc YYYY.\n"
        "- detail_text: Tên phúc lợi, chế độ bảo hiểm (VD: 'omdau', 'thaisan'), chức danh, v.v.\n\n"
        "=== DANH SÁCH LOẠI VĂN BẢN VÀ QUY TẮC ===\n"
        f"{doc_types_str}\n\n"
        "=== DANH SÁCH NHÂN VIÊN (dùng để đối chiếu) ===\n"
        f"{emp_list_str}\n\n"
        "QUAN TRỌNG: Trả về kết quả dưới định dạng JSON thuần túy, tuyệt đối không chèn thêm bất kỳ văn bản nào khác bên ngoài JSON block.\n"
        "Định dạng JSON:\n"
        "{\n"
        "  \"doc_type\": \"<Mã viết tắt hoặc null>\",\n"
        "  \"raw_employee_name\": \"<Tên đầy đủ của nhân viên TỪ DANH SÁCH hoặc null>\",\n"
        "  \"raw_employee_code\": \"<Mã nhân viên TỪ DANH SÁCH hoặc null>\",\n"
        "  \"document_number\": \"<Số văn bản hoặc null>\",\n"
        "  \"document_date\": \"<Ngày văn bản dạng DDMMYYYY hoặc null>\",\n"
        "  \"period\": \"<Kỳ thời gian dạng MMYYYY hoặc null>\",\n"
        "  \"detail_text\": \"<Chi tiết nội dung hoặc null>\",\n"
        "  \"reason\": \"<Lý do ngắn gọn>\"\n"
        "}"
    )

    user_prompt = f"Đoạn văn bản trích xuất từ tài liệu:\n\n{text}"

    return system_prompt, user_prompt


def _call_azure_openai(system_prompt: str, user_prompt: str) -> str:
    """
    Gọi Azure OpenAI.
    """
    client = get_azure_client()
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    print(f"[Azure OpenAI] Đang gọi API với deployment: {settings.AZURE_OPENAI_CHAT_DEPLOYMENT}")
    
    response = client.chat.completions.create(
        model=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,
        messages=messages,
        temperature=0.0,
        max_tokens=512,
        response_format={"type": "json_object"}
    )
    
    raw = response.choices[0].message.content.strip()
    
    # Strip markdown code blocks just in case
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if len(lines) > 2 else raw
    return raw


def classify_document_groq(text: str, rules: list, employees: list):
    """
    Hàm phân loại (Giữ nguyên tên hàm classify_document_groq để tương thích với code cũ 
    nhưng bên trong đã gọi hoàn toàn bằng Azure OpenAI).
    """
    system_prompt, user_prompt = build_classification_prompt(text, rules, employees)
    
    # Debug: Print OCR text preview
    print(f"[OCR Text Preview] ({len(text)} chars): {text[:300]}...")

    try:
        raw_content = _call_azure_openai(system_prompt, user_prompt)
        result = json.loads(raw_content)
        print(f"[Azure OpenAI] Phân loại thành công. Response: {raw_content[:500]}")
        print(f"[Azure OpenAI] OCR text length: {len(text)} chars, Employees in prompt: {len(employees)}")
        return result
    except json.JSONDecodeError as e:
        print(f"[Azure OpenAI] Lỗi parse JSON: {e}. Output LLM: {raw_content}")
    except Exception as e:
        print(f"[Azure OpenAI] Lỗi suy luận: {e}")

    print("[Azure OpenAI] Phân loại thất bại. Dùng rule-based fallback.")
    return None
