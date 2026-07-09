"""
LLM Service - Chạy Local Model Qwen2.5-3B-Instruct GGUF
Sử dụng llama-cpp-python để tối ưu hóa cho CPU.
"""
import json
import re
import os
from app.core.config import settings

# Lazy-load Local LLM
_llm = None
MODEL_REPO = "Qwen/Qwen2.5-3B-Instruct-GGUF"
MODEL_FILENAME = "qwen2.5-3b-instruct-q4_k_m.gguf"

# Giới hạn độ dài text OCR để tránh vượt context window
MAX_OCR_CHARS = 4000

def get_local_llm():
    """Khởi tạo Local LLM (lazy singleton)."""
    global _llm
    if _llm is None:
        try:
            from llama_cpp import Llama
            from huggingface_hub import hf_hub_download
        except ImportError:
            raise ImportError("Package 'llama-cpp-python' hoặc 'huggingface_hub' chưa được cài.")

        print(f"[Local LLM] Downloading/Locating model {MODEL_FILENAME} từ {MODEL_REPO}...")
        try:
            model_path = hf_hub_download(repo_id=MODEL_REPO, filename=MODEL_FILENAME)
        except Exception as e:
            print(f"[Local LLM] Lỗi khi tải model: {e}")
            raise

        print(f"[Local LLM] Loading model từ {model_path} vào RAM (CPU mode)...")
        _llm = Llama(
            model_path=model_path,
            n_ctx=8192,  # Tăng lên 8K để đủ chứa rules dài và text OCR + max_tokens
            n_threads=os.cpu_count() or 4,
            verbose=False
        )
        print("[Local LLM] Model đã load xong vào RAM!")
    return _llm


def truncate_text(text: str, max_chars: int = MAX_OCR_CHARS) -> str:
    """Cắt bớt text OCR nếu quá dài."""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    print(f"[Local LLM] Text OCR đã bị truncate: {len(text)} -> {max_chars} ký tự")
    return truncated


def build_classification_prompt(text: str, rules: list, employees: list) -> tuple:
    """Tạo system prompt và user prompt để phân loại tài liệu."""
    text = truncate_text(text)

    doc_rules_list = []
    for r in rules:
        rule_desc = f"- Mã viết tắt: {r['doc_type']} | Tên loại: {r['keyword']}"
        if r.get('required_phrases'):
            rule_desc += f" | Cụm từ bắt buộc (phân tách bởi | hoặc ;): {r['required_phrases']}"
        if r.get('excluded_phrases'):
            rule_desc += f" | Cụm từ loại trừ (phân tách bởi | hoặc ;): {r['excluded_phrases']}"
        doc_rules_list.append(rule_desc)

    doc_types_str = "\n".join(doc_rules_list)

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
        "- detail_text: Tên phúc lợi, chế độ bảo hiểm (VD: 'omdau', 'thaisan'), chức danh, v.v.\n"
        "- LƯU Ý QUAN TRỌNG: Một số nhân viên có mã cũ kết thúc bằng dấu chấm (VD: '1234.', 'NV001.'). Nếu văn bản có dấu chấm liền kề mã, BẮT BUỘC giữ nguyên dấu chấm đó trong raw_employee_code, tuyệt đối KHÔNG tự ý xóa.\n\n"
        "Dưới đây là danh sách loại văn bản và quy định cụm từ:\n"
        f"{doc_types_str}\n\n"
        "QUAN TRỌNG: Trả về kết quả dưới định dạng JSON thuần túy, tuyệt đối không chèn thêm bất kỳ văn bản nào khác bên ngoài JSON block.\n"
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


def _call_local_llm(system_prompt: str, user_prompt: str) -> str:
    """
    Gọi Local LLM.
    """
    llm = get_local_llm()
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    print("[Local LLM] Đang suy luận (Inference)... Quá trình này có thể mất 10-30s trên CPU.")
    
    # llama-cpp-python hỗ trợ response_format={"type": "json_object"}
    response = llm.create_chat_completion(
        messages=messages,
        temperature=0.0,
        max_tokens=512,
        response_format={"type": "json_object"}
    )
    
    raw = response["choices"][0]["message"]["content"].strip()
    
    # Strip markdown code blocks just in case
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if len(lines) > 2 else raw
    return raw


def classify_document_groq(text: str, rules: list, employees: list):
    """
    Hàm phân loại (Giữ nguyên tên hàm `classify_document_groq` để tương thích với code cũ 
    nhưng bên trong đã gọi hoàn toàn bằng Local LLM).
    """
    system_prompt, user_prompt = build_classification_prompt(text, rules, employees)

    try:
        raw_content = _call_local_llm(system_prompt, user_prompt)
        result = json.loads(raw_content)
        print(f"[Local LLM] Phân loại thành công.")
        return result
    except json.JSONDecodeError as e:
        print(f"[Local LLM] Lỗi parse JSON: {e}. Output LLM: {raw_content}")
    except Exception as e:
        print(f"[Local LLM] Lỗi suy luận: {e}")

    print("[Local LLM] Phân loại thất bại. Dùng rule-based fallback.")
    return None
