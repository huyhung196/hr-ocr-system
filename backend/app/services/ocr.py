import os
# Disable MKLDNN to avoid PIR execution attribute conversion bug on CPU
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"

from paddleocr import PaddleOCR
import re
import fitz
import json
from app.core.config import settings
from app.services.llm_service import classify_document_groq

# Initialize OCR engine for Vietnamese
ocr = PaddleOCR(use_angle_cls=True, lang='vi', enable_mkldnn=False)

vietocr_predictor = None

def get_vietocr_predictor():
    global vietocr_predictor
    if vietocr_predictor is None:
        from vietocr.tool.config import Cfg
        from vietocr.tool.predictor import Predictor
        import torch
        
        config = Cfg.load_config_from_name('vgg_transformer')
        config['device'] = 'cuda' if torch.cuda.is_available() else 'cpu'
        config['predictor']['beamsearch'] = True
        vietocr_predictor = Predictor(config)
    return vietocr_predictor

def preprocess_crop(pil_img):
    try:
        import cv2
        import numpy as np
        from PIL import Image
        
        # 1. Convert to grayscale
        open_cv_image = np.array(pil_img.convert('RGB'))
        gray = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2GRAY)
        
        # 2. Scale up if height is too small (makes letters cleaner)
        h, w = gray.shape[:2]
        if h < 45:
            scale = 64.0 / h
            gray = cv2.resize(gray, (int(w * scale), 64), interpolation=cv2.INTER_CUBIC)
            
        # 3. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        return Image.fromarray(enhanced)
    except Exception as e:
        print(f"Error preprocessing crop: {e}")
        return pil_img


def get_ocr_boxes(result) -> list:
    if not result:
        return []
    res_page = result[0]
    boxes = []
    if isinstance(res_page, dict) or hasattr(res_page, "get"):
        boxes = res_page.get('dt_polys', [])
    elif isinstance(res_page, list):
        for res in res_page:
            if isinstance(res, list) and len(res) > 0:
                boxes.append(res[0])
    return boxes

def parse_ocr_result(result) -> list:
    text_lines = []
    if not result or len(result) == 0 or result[0] is None:
        return text_lines
        
    res_page = result[0]
    if isinstance(res_page, dict) or hasattr(res_page, "get"):
        texts = res_page.get('rec_texts', [])
        for text in texts:
            if isinstance(text, str):
                text_lines.append(text)
    elif isinstance(res_page, list):
        for res in res_page:
            if isinstance(res, list) and len(res) > 1:
                text_tuple = res[1]
                if isinstance(text_tuple, (list, tuple)) and len(text_tuple) > 0:
                    text_lines.append(text_tuple[0])
    return text_lines

def extract_text_from_image(image_path: str, ocr_method: str = "paddle") -> str:
    try:
        text_lines = []
        
        if image_path.lower().endswith('.pdf'):
            doc = fitz.open(image_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                # Try direct text extraction (for digital PDFs)
                direct_text = page.get_text()
                if len(direct_text.strip()) > 50:
                    text_lines.append(direct_text)
                    continue
                
                # If scanned PDF, convert to image for OCR
                mat = fitz.Matrix(2.0, 2.0)
                pix = page.get_pixmap(matrix=mat)
                
                temp_img_path = f"{image_path}_page_{page_num}.png"
                pix.save(temp_img_path)
                
                if ocr_method == "vietocr":
                    result = ocr.ocr(temp_img_path)
                    boxes = get_ocr_boxes(result)
                    if boxes:
                        from PIL import Image
                        img = Image.open(temp_img_path)
                        width, height = img.size
                        for box in boxes:
                            xs = [p[0] for p in box]
                            ys = [p[1] for p in box]
                            min_x = max(0, int(min(xs)))
                            max_x = min(width, int(max(xs)))
                            min_y = max(0, int(min(ys)))
                            max_y = min(height, int(max(ys)))
                            if max_x > min_x and max_y > min_y:
                                cropped_img = img.crop((min_x, min_y, max_x, max_y))
                                prep_img = preprocess_crop(cropped_img)
                                text_line = get_vietocr_predictor().predict(prep_img)
                                if text_line:
                                    text_lines.append(text_line)
                else:
                    # Call PaddleOCR
                    result = ocr.ocr(temp_img_path)
                    text_lines.extend(parse_ocr_result(result))
                        
                # Remove temp image
                try:
                    os.remove(temp_img_path)
                except OSError:
                    pass
            doc.close()
        else:
            if ocr_method == "vietocr":
                result = ocr.ocr(image_path)
                boxes = get_ocr_boxes(result)
                if boxes:
                    from PIL import Image
                    img = Image.open(image_path)
                    width, height = img.size
                    for box in boxes:
                        xs = [p[0] for p in box]
                        ys = [p[1] for p in box]
                        min_x = max(0, int(min(xs)))
                        max_x = min(width, int(max(xs)))
                        min_y = max(0, int(min(ys)))
                        max_y = min(height, int(max(ys)))
                        if max_x > min_x and max_y > min_y:
                            cropped_img = img.crop((min_x, min_y, max_x, max_y))
                            prep_img = preprocess_crop(cropped_img)
                            text_line = get_vietocr_predictor().predict(prep_img)
                            if text_line:
                                text_lines.append(text_line)
            else:
                result = ocr.ocr(image_path)
                text_lines.extend(parse_ocr_result(result))

        return " ".join(text_lines)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error extracting text from {image_path}: {e}")
        return ""

def remove_vietnamese_diacritics(s: str) -> str:
    if not s:
        return ""
    trans_map = {
        'á':'a','à':'a','ả':'a','ã':'a','ạ':'a','ă':'a','ắ':'a','ằ':'a','ẳ':'a','ẵ':'a','ặ':'a','â':'a','ấ':'a','ầ':'a','ẩ':'a','ẫ':'a','ậ':'a',
        'Á':'A','À':'A','Ả':'A','Ã':'A','Ạ':'A','Ă':'A','Ắ':'A','Ằ':'A','Ẳ':'A','Ẵ':'A','Ặ':'A','Â':'A','Ấ':'A','Ầ':'A','Ẩ':'A','Ẫ':'A','Ậ':'A',
        'é':'e','è':'e','ẻ':'e','ẽ':'e','ẹ':'e','ê':'e','ế':'e','ề':'e','ể':'e','ễ':'e','ệ':'e',
        'É':'E','È':'E','Ẻ':'E','Ẽ':'E','Ẹ':'E','Ê':'E','Ế':'E','Ề':'E','Ể':'E','Ễ':'E','Ệ':'E',
        'í':'i','ì':'i','ỉ':'i','ĩ':'i','ị':'i',
        'Í':'I','Ì':'I','Ỉ':'I','Ĩ':'I','Ị':'I',
        'ó':'o','ò':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ố':'o','ồ':'o','ổ':'o','ộ':'o','ơ':'o','ớ':'o','ờ':'o','ở':'o','ỡ':'o','ợ':'o',
        'Ó':'O','Ò':'O','Ỏ':'O','Õ':'O','Ọ':'O','Ô':'O','Ố':'O','Ồ':'O','Ổ':'O','Ộ':'O','Ơ':'O','Ớ':'O','Ờ':'O','Ở':'O','Ỡ':'O','Ợ':'O',
        'ú':'u','ù':'u','ủ':'u','ũ':'u','ụ':'u','ư':'u','ứ':'u','ừ':'u','ử':'u','ự':'u',
        'Ú':'U','Ù':'U','Ủ':'U','Ũ':'U','Ụ':'U','Ư':'U','Ứ':'U','Ừ':'U','Ử':'U','Ữ':'U','Ự':'U',
        'ý':'y','ỳ':'y','ỷ':'y','ỹ':'y','ỵ':'y',
        'Ý':'Y','Ỳ':'Y','Ỷ':'Y','Ỹ':'Y','Ỵ':'Y',
        'đ':'d','Đ':'D'
    }
    res = "".join(trans_map.get(c, c) for c in s)
    misc_map = {
        'Ö':'O', 'ö':'o', 'Ę':'E', 'ę':'e', 'Ä':'A', 'ä':'a', 'Ü':'U', 'ü':'u'
    }
    res = "".join(misc_map.get(c, c) for c in res)
    return res

def identify_document(text: str, rules: list, employees: list):
    extracted_doc_type = None
    extracted_employee_code = None
    meta_dict = {
        "document_number": None,
        "document_date": None,
        "period": None,
        "detail_text": None
    }

    # 1. Try with Groq API (Qwen model)
    try:
        result = classify_document_groq(text, rules, employees)
        
        if result:
            extracted_doc_type = result.get("doc_type")
            
            # Map raw employee info from LLM back to valid employee code
            raw_emp_code = result.get("raw_employee_code")
            raw_emp_name = result.get("raw_employee_name")
            
            valid_doc_types = {r['doc_type'] for r in rules}
            if extracted_doc_type not in valid_doc_types:
                extracted_doc_type = None

            if raw_emp_code:
                raw_emp_code = str(raw_emp_code).strip()
                if raw_emp_code.endswith('.0'):
                    raw_emp_code = raw_emp_code[:-2]
            
            # Fuzzy match employee locally to save LLM tokens
            for emp in employees:
                # Trực tiếp khớp mã
                if raw_emp_code and raw_emp_code.upper() == emp['employee_code'].upper():
                    extracted_employee_code = emp['employee_code']
                    break
                # Khớp theo tên đã chuẩn hoá tiếng Việt (không dấu)
                if raw_emp_name and emp['full_name']:
                    norm_raw_name = remove_vietnamese_diacritics(raw_emp_name).upper()
                    norm_db_name = remove_vietnamese_diacritics(emp['full_name']).upper()
                    if norm_db_name and (norm_db_name in norm_raw_name or norm_raw_name in norm_db_name):
                        extracted_employee_code = emp['employee_code']
                        break
            
            meta_dict["document_number"] = result.get("document_number")
            meta_dict["document_date"] = result.get("document_date")
            meta_dict["period"] = result.get("period")
            meta_dict["detail_text"] = result.get("detail_text")
            
            if extracted_doc_type and extracted_employee_code:
                print(f"[Groq Classifier] Matched: Doc Type={extracted_doc_type}, Employee={extracted_employee_code}. Reason: {result.get('reason')}")
                return extracted_doc_type, extracted_employee_code, meta_dict
            
            print(f"[Groq Classifier] Partial match: Doc Type={extracted_doc_type}, Employee={extracted_employee_code} (Raw: {raw_emp_name}/{raw_emp_code}). Falling back to rule-based.")
        else:
            print("[Groq Classifier] Không nhận được kết quả từ Groq, dùng rule-based fallback.")

    except Exception as e:
        print(f"[Groq Classifier] Lỗi: {e}. Dùng rule-based fallback.")

    # 2. Rule-based Fallback matching
    text_upper = text.upper()
    
    if not extracted_doc_type:
        for rule in rules:
            required_str = rule.get('required_phrases', '')
            excluded_str = rule.get('excluded_phrases', '')
            
            required_words = []
            if required_str:
                for sep in ['|', ';']:
                    if sep in required_str:
                        required_words = [w.strip().upper() for w in required_str.split(sep) if w.strip()]
                        break
                if not required_words:
                    required_words = [required_str.strip().upper()]
            
            excluded_words = []
            if excluded_str:
                for sep in ['|', ';']:
                    if sep in excluded_str:
                        excluded_words = [w.strip().upper() for w in excluded_str.split(sep) if w.strip()]
                        break
                if not excluded_words:
                    excluded_words = [excluded_str.strip().upper()]
            
            has_required = False
            if required_words:
                for word in required_words:
                    if word in text_upper:
                        has_required = True
                        break
            else:
                if rule['keyword'].upper() in text_upper:
                    has_required = True
            
            has_excluded = False
            if excluded_words:
                for word in excluded_words:
                    if word in text_upper:
                        has_excluded = True
                        break
            
            if has_required and not has_excluded:
                extracted_doc_type = rule['doc_type']
                break
                
    if not extracted_employee_code:
        # Normalize OCR digits for numeric matching (CCCD/BHXH)
        ocr_digits = "".join(c for c in text_upper if c.isdigit())
        norm_ocr = remove_vietnamese_diacritics(text_upper)
        
        # 2a. Match by CCCD or BHXH numbers if present in OCR text
        for emp in employees:
            emp_cccd = "".join(c for c in str(emp.get('cccd', '')) if c.isdigit())
            if emp_cccd and len(emp_cccd) >= 9 and emp_cccd in ocr_digits:
                extracted_employee_code = emp['employee_code']
                print(f"[Fallback Classifier] Matched Employee={extracted_employee_code} by CCCD Number: {emp_cccd}")
                break
                
            emp_bhxh = "".join(c for c in str(emp.get('bhxh', '')) if c.isdigit())
            if emp_bhxh and len(emp_bhxh) >= 9 and emp_bhxh in ocr_digits:
                extracted_employee_code = emp['employee_code']
                print(f"[Fallback Classifier] Matched Employee={extracted_employee_code} by BHXH Number: {emp_bhxh}")
                break
                
        # 2b. Match by name or code if numeric fallback fails
        if not extracted_employee_code:
            for emp in employees:
                if emp['employee_code'] in text_upper:
                    extracted_employee_code = emp['employee_code']
                    print(f"[Fallback Classifier] Matched Employee={extracted_employee_code} by exact Employee Code in text")
                    break
                
                # Compare normalized names
                norm_name = remove_vietnamese_diacritics(emp['full_name']).upper()
                if norm_name and norm_name in norm_ocr:
                    extracted_employee_code = emp['employee_code']
                    print(f"[Fallback Classifier] Matched Employee={extracted_employee_code} by Normalized Name: {norm_name}")
                    break
                
    return extracted_doc_type, extracted_employee_code, meta_dict
