import { Clock, Upload, FileText, Edit3 } from 'lucide-react';

function UploadTab({ isUploading, handleFileUpload, ocrMethod, setOcrMethod }) {
  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px' }}>Tải Lên File Quét Tài Liệu</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          Hỗ trợ PDF, PNG, JPG. Trình AI phân tích sẽ tự động trích xuất mã nhân viên, phân biệt loại giấy tờ và điền các metadata liên quan.
        </p>
      </div>
      
      {/* OCR Method Selector */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '16px', 
        marginBottom: '28px' 
      }}>
        <div 
          onClick={() => !isUploading && setOcrMethod('paddle')}
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            border: `2px solid ${ocrMethod === 'paddle' ? 'var(--primary-accent)' : 'rgba(244, 63, 94, 0.1)'}`,
            background: ocrMethod === 'paddle' ? '#fff8f9' : 'white',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: ocrMethod === 'paddle' ? 'var(--card-shadow-hover)' : 'none',
            opacity: isUploading && ocrMethod !== 'paddle' ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div style={{
            background: ocrMethod === 'paddle' ? 'var(--primary-accent)' : 'var(--primary-light)',
            color: ocrMethod === 'paddle' ? 'white' : 'var(--primary-accent)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}>
            <FileText size={22} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h4 style={{ fontSize: '15px', color: 'var(--text-main)', margin: 0, fontWeight: '700' }}>
              Chữ In / Scan Số Hóa
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.3 }}>
              Sử dụng PaddleOCR. Phù hợp các quyết định, hợp đồng in sẵn, rõ nét.
            </p>
          </div>
        </div>

        <div 
          onClick={() => !isUploading && setOcrMethod('vietocr')}
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            border: `2px solid ${ocrMethod === 'vietocr' ? 'var(--primary-accent)' : 'rgba(244, 63, 94, 0.1)'}`,
            background: ocrMethod === 'vietocr' ? '#fff8f9' : 'white',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: ocrMethod === 'vietocr' ? 'var(--card-shadow-hover)' : 'none',
            opacity: isUploading && ocrMethod !== 'vietocr' ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div style={{
            background: ocrMethod === 'vietocr' ? 'var(--primary-accent)' : 'var(--primary-light)',
            color: ocrMethod === 'vietocr' ? 'white' : 'var(--primary-accent)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}>
            <Edit3 size={22} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h4 style={{ fontSize: '15px', color: 'var(--text-main)', margin: 0, fontWeight: '700' }}>
              Chữ Viết Tay Tiếng Việt
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.3 }}>
              Sử dụng VietOCR (Transformer). Tối ưu cho đơn từ viết tay, ghi chú, ký nhận.
            </p>
          </div>
        </div>
      </div>
      
      <label className="upload-area" style={{ display: 'block' }}>
        <input 
          type="file" 
          multiple 
          accept=".pdf,.png,.jpg,.jpeg" 
          onChange={handleFileUpload} 
          style={{ display: 'none' }} 
          disabled={isUploading}
        />
        {isUploading ? (
          <div>
            <Clock className="upload-icon" style={{ animation: 'pulse 1.5s infinite' }} />
            <h3 style={{ fontSize: '18px', color: 'var(--primary-accent)' }}>Đang chạy OCR & Trích xuất quy tắc cây lưu trữ...</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Chị Anh Thư đợi em quét thông tin trong giây lát nhé 🌸</p>
          </div>
        ) : (
          <div>
            <Upload className="upload-icon" />
            <h3 style={{ fontSize: '18px' }}>Kéo thả file vào đây hoặc Click để duyệt file</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Nhận diện thông minh cả PDF dạng quét (Scanned) và PDF điện tử</p>
          </div>
        )}
      </label>
    </div>
  );
}

export default UploadTab;
