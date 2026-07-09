import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../services/api';

function RuleModal({ onClose, onSaveSuccess, existingRule = null }) {
  const isEdit = !!existingRule;
  const [formData, setFormData] = useState({
    doc_type: '',
    keyword: '',
    required_phrases: '',
    excluded_phrases: '',
    format: '',
    folder_path: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit && existingRule) {
      setFormData({
        doc_type: existingRule.doc_type || '',
        keyword: existingRule.keyword || '',
        required_phrases: existingRule.required_phrases || '',
        excluded_phrases: existingRule.excluded_phrases || '',
        format: existingRule.format || '',
        folder_path: existingRule.folder_path || ''
      });
    }
  }, [existingRule, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doc_type || !formData.keyword) {
      setError('Mã loại và tên quy tắc là bắt buộc');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) {
        await axios.put(`${API_URL}/doc_rules/${formData.doc_type}`, formData);
      } else {
        await axios.post(`${API_URL}/doc_rules`, formData);
      }
      onSaveSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Đã xảy ra lỗi khi lưu quy tắc. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
            {isEdit ? `Sửa quy tắc: ${formData.doc_type}` : 'Thêm quy tắc mới'}
          </h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body" style={{ padding: '24px' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label">Mã loại quy tắc (doc_type) <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="input-control" 
                  name="doc_type"
                  value={formData.doc_type}
                  onChange={handleChange}
                  placeholder="VD: HDLD, QD, GKS..."
                  disabled={isEdit}
                  required
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Mã duy nhất viết tắt cho loại tài liệu này. Không thể sửa sau khi tạo.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tên phân loại <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="input-control" 
                  name="keyword"
                  value={formData.keyword}
                  onChange={handleChange}
                  placeholder="VD: Hợp đồng lao động"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cụm từ bắt buộc</label>
                <input 
                  type="text" 
                  className="input-control" 
                  name="required_phrases"
                  value={formData.required_phrases}
                  onChange={handleChange}
                  placeholder="VD: hợp đồng|hdlđ|hđlđ"
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Các từ khóa để AI nhận diện, phân tách bởi dấu | (hoặc).
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Cụm từ loại trừ</label>
                <input 
                  type="text" 
                  className="input-control" 
                  name="excluded_phrases"
                  value={formData.excluded_phrases}
                  onChange={handleChange}
                  placeholder="VD: phụ lục|thử việc"
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Nếu tài liệu chứa các từ này, hệ thống sẽ BỎ QUA không xếp vào loại này.
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Format tên file lưu</label>
                <input 
                  type="text" 
                  className="input-control" 
                  name="format"
                  value={formData.format}
                  onChange={handleChange}
                  placeholder="VD: HDLD_{MNV}_{Tên}_{YYYY}"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thư mục cất trữ (Folder Logic)</label>
                <input 
                  type="text" 
                  className="input-control" 
                  name="folder_path"
                  value={formData.folder_path}
                  onChange={handleChange}
                  placeholder="VD: Hồ sơ nhân sự/{Công ty}/{Bộ phận}"
                />
              </div>
              
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} disabled={loading}>
                <Save size={16} /> {loading ? 'Đang lưu...' : 'Lưu quy tắc'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RuleModal;
