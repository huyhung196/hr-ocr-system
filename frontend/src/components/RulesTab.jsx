import { useState } from 'react';
import { Search, RefreshCw, FileCheck, Plus, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../services/api';
import RuleModal from './RuleModal';

function RulesTab({
  filteredRules,
  ruleSearch,
  setRuleSearch,
  ruleGroupFilter,
  setRuleGroupFilter,
  fetchRules,
  testText,
  handleTestTextChange,
  testResult,
  triggerToast
}) {
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);

  const handleEdit = (rule) => {
    setSelectedRule(rule);
    setShowRuleModal(true);
  };

  const handleAdd = () => {
    setSelectedRule(null);
    setShowRuleModal(true);
  };

  const handleDelete = async (doc_type) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa quy tắc phân loại "${doc_type}" không?`)) {
      try {
        await axios.delete(`${API_URL}/doc_rules/${doc_type}`);
        if (triggerToast) triggerToast("Đã xóa quy tắc thành công", "success");
        fetchRules();
      } catch (error) {
        console.error("Lỗi khi xóa quy tắc:", error);
        if (triggerToast) triggerToast("Lỗi khi xóa quy tắc", "danger");
      }
    }
  };

  return (
    <div className="glass-panel animate-fade-in">
      {showRuleModal && (
        <RuleModal 
          onClose={() => setShowRuleModal(false)}
          onSaveSuccess={() => {
            setShowRuleModal(false);
            if (triggerToast) triggerToast("Đã lưu quy tắc thành công", "success");
            fetchRules();
          }}
          existingRule={selectedRule}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Danh mục Quy tắc Cây lưu trữ</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Bản đồ hướng dẫn phân loại và các từ khóa bắt buộc/loại trừ được định nghĩa trong Excel.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={fetchRules}>
            <RefreshCw size={14} /> Làm mới
          </button>
          <button className="btn btn-primary" onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Thêm quy tắc
          </button>
        </div>
      </div>

      {/* Interactive Live Rule Tester Box */}
      <div className="tester-box">
        <h4 className="tester-title">
          <FileCheck size={20} style={{ color: 'var(--primary-accent)' }} /> 
          Bộ thử nghiệm phân loại trực tiếp (Live Rule Tester)
        </h4>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          HR có thể gõ thử một đoạn văn bản trích xuất được từ OCR hoặc nhập tiêu đề tài liệu để test nhanh xem hệ thống sẽ phân loại thành loại giấy tờ nào dựa trên cụm từ bắt buộc.
        </p>
        <div className="tester-grid">
          <div>
            <label className="form-label" style={{ fontWeight: '700' }}>Nhập nội dung test thử</label>
            <textarea 
              className="input-control" 
              rows={4}
              value={testText}
              onChange={handleTestTextChange}
              placeholder="VD: Nhập 'BẢN ĐĂNG KÝ NGƯỜI PHỤ THUỘC giảm trừ gia cảnh' hoặc 'Hợp đồng lao động và người lao động'..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="tester-result-panel">
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Kết quả phân tích:</span>
            {testResult ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="tester-badge-pill">{testResult.doc_type}</span>
                  <strong style={{ color: 'var(--text-main)' }}>{testResult.keyword}</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', marginTop: '10px' }}>
                  <div>• Định dạng lưu file: <code style={{ color: '#0d9488' }}>{testResult.format}</code></div>
                  <div>• Thư mục đích: <code style={{ color: '#ea580c' }}>{testResult.folder_path}</code></div>
                  <div style={{ color: '#0f766e', marginTop: '6px', fontSize: '12px' }}>
                    ✓ Khớp cụm từ bắt buộc: <em>{testResult.required_phrases}</em>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                {testText.trim() ? "Không khớp quy tắc nào. Vui lòng kiểm tra lại các từ khóa." : "Nhập văn bản bên trái để xem kết quả phân loại."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Group Tabs for Rules */}
      <div className="search-filter-bar" style={{ marginTop: '24px' }}>
        <div className="search-input-wrapper" style={{ maxWidth: '360px' }}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            className="input-control" 
            placeholder="Tìm kiếm theo mã viết tắt, tên loại..."
            value={ruleSearch}
            onChange={(e) => setRuleSearch(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-muted)' }}>Hạng mục:</span>
          <select 
            className="input-control"
            value={ruleGroupFilter}
            onChange={(e) => setRuleGroupFilter(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="all">Tất cả quy tắc</option>
            <option value="nhansu">1. Hồ sơ nhân sự</option>
            <option value="luong">2. Hồ sơ lương</option>
            <option value="thue">3. Thuế TNCN</option>
            <option value="bhxh">4. Bảo hiểm xã hội</option>
            <option value="khac">5. Khác / Dịch vụ / Thiết kế</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Mã loại</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Tên phân loại</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Cụm từ bắt buộc</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Cụm từ loại trừ</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Format tên file lưu</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px', minWidth: '130px' }}>Folder cất trữ</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.map((rule, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: '700', color: 'var(--primary-accent)', padding: '14px 10px', fontSize: '13px', whiteSpace: 'nowrap' }}>{rule.doc_type}</td>
                <td style={{ fontWeight: '600', padding: '14px 10px', fontSize: '13px', whiteSpace: 'nowrap' }}>{rule.keyword}</td>
                <td style={{ fontSize: '12.5px', color: '#0f766e', padding: '14px 10px', minWidth: '150px' }}>
                  {rule.required_phrases ? rule.required_phrases.split('|').join(' | ') : '—'}
                </td>
                <td style={{ fontSize: '12.5px', color: '#be123c', padding: '14px 10px', minWidth: '150px' }}>
                  {rule.excluded_phrases ? rule.excluded_phrases.split('|').join(' | ') : '—'}
                </td>
                <td style={{ fontStyle: 'italic', fontSize: '12.5px', padding: '14px 10px', whiteSpace: 'nowrap' }}>{rule.format || '—'}</td>
                <td style={{ padding: '14px 10px', fontSize: '13px', minWidth: '130px' }}>
                  <span className="path-text" title={rule.folder_path}>{rule.folder_path}</span>
                </td>
                <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button className="btn-icon" onClick={() => handleEdit(rule)} title="Sửa">
                      <Edit size={16} />
                    </button>
                    <button className="btn-icon" onClick={() => handleDelete(rule.doc_type)} title="Xóa" style={{ color: '#ef4444' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RulesTab;
