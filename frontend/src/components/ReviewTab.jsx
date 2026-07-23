import { useState } from 'react';
import { RefreshCw, CheckSquare, Square, CheckCircle, Clock, Eye, FileText, XCircle, Loader } from 'lucide-react';

function ReviewTab({
  scans,
  employees,
  rules,
  fetchScans,
  updateScanStatus,
  handleBulkApprove,
  handleFieldChange,
  getPreview,
  UNIQUE_DOC_TYPES,
  activeReviewId,
  setActiveReviewId,
  selectedScanIds,
  setSelectedScanIds
}) {
  const reviewPendingList = scans.filter(s => s.status === 'Chờ review tên' || s.status === 'Sẵn sàng đặt tên');
  const activeScan = scans.find(s => s.id === activeReviewId);
  const [savingId, setSavingId] = useState(null);

  const handleSave = async (scanId, status, data) => {
    setSavingId(scanId);
    await updateScanStatus(scanId, status, data);
    setSavingId(null);
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Kiểm tra & Soát xét Hồ sơ</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Dưới đây là các tài liệu được OCR trích xuất. Vui lòng kiểm tra và sửa lại các metadata nếu cần thiết trước khi Xác nhận lưu trữ.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchScans}>
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Bulk Actions Control Header */}
      {selectedScanIds.length > 0 && (
        <div className="bulk-action-bar">
          <span className="bulk-info-text">
            <CheckSquare size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Đang chọn <strong>{selectedScanIds.length}</strong> tài liệu để duyệt hàng loạt
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={handleBulkApprove}>
              Duyệt & Lưu Trữ Ngay
            </button>
            <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--text-main)' }} onClick={() => setSelectedScanIds([])}>
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Split View Workspace */}
      <div className="review-split-container">
        {/* Left Side: List & Form Editors */}
        <div className="review-list-side">
          {reviewPendingList.map(scan => {
            const isActive = scan.id === activeReviewId;
            const isSelected = selectedScanIds.includes(scan.id);
            const matchedEmp = employees.find(e => e.employee_code === scan.extracted_employee_code);
            const { fileName, folderPath } = getPreview(scan, rules, employees);
            const isReady = scan.extracted_doc_type && scan.extracted_employee_code;

            return (
              <div 
                key={scan.id} 
                className={`review-card ${isActive ? 'active-item' : ''}`}
                style={{ 
                  border: isActive ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                  gridTemplateColumns: '1fr',
                  cursor: 'pointer',
                  padding: '16px'
                }}
                onClick={() => setActiveReviewId(scan.id)}
              >
                {/* Top Row: Select Checkbox & File Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #ffe4e6', paddingBottom: '8px', marginBottom: '12px' }}>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) {
                        setSelectedScanIds(selectedScanIds.filter(id => id !== scan.id));
                      } else {
                        setSelectedScanIds([...selectedScanIds, scan.id]);
                      }
                    }}
                    style={{ color: 'var(--primary-accent)', cursor: 'pointer' }}
                  >
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <h4 
                    style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} 
                    title={scan.original_file_name}
                  >
                    📄 {scan.original_file_name}
                  </h4>
                  <span className={`badge ${isReady ? 'badge-success' : 'badge-warning'}`} style={{ padding: '2px 8px', fontSize: '10px' }}>
                    {isReady ? 'Sẵn sàng' : 'Thiếu thông tin'}
                  </span>
                </div>

                {/* If Active, Show Form Editors. Otherwise, Show Summary */}
                {isActive ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="metadata-grid-form">
                      {/* Doc Type Dropdown */}
                      <div className="form-field">
                        <label className="form-label">Loại viết tắt</label>
                        <select 
                          className="input-control"
                          value={scan.extracted_doc_type || ''}
                          onChange={(e) => handleFieldChange(scan.id, 'extracted_doc_type', e.target.value)}
                        >
                          <option value="">-- Chọn loại --</option>
                          {UNIQUE_DOC_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      {/* Employee ID autocomplete */}
                      <div className="form-field">
                        <label className="form-label">Mã nhân viên</label>
                        <input 
                          list={`employees-list-${scan.id}`}
                          className="input-control" 
                          value={scan.extracted_employee_code || ''} 
                          onChange={(e) => handleFieldChange(scan.id, 'extracted_employee_code', e.target.value)}
                          placeholder="Mã nhân viên..."
                        />
                        <datalist id={`employees-list-${scan.id}`}>
                          {employees.map(emp => (
                            <option key={emp.employee_code} value={emp.employee_code}>
                              {emp.employee_code} - {emp.full_name} ({emp.company})
                            </option>
                          ))}
                        </datalist>
                      </div>

                      {/* Document Number */}
                      <div className="form-field">
                        <label className="form-label">Số quyết định / Hợp đồng</label>
                        <input 
                          type="text"
                          className="input-control" 
                          value={scan.document_number || ''} 
                          onChange={(e) => handleFieldChange(scan.id, 'document_number', e.target.value)}
                          placeholder="VD: 80/2021/TT-BTC..."
                        />
                      </div>

                      {/* Document Date */}
                      <div className="form-field">
                        <label className="form-label">Ngày hiệu lực (DDMMYYYY)</label>
                        <input 
                          type="text"
                          className="input-control" 
                          value={scan.document_date || ''} 
                          onChange={(e) => handleFieldChange(scan.id, 'document_date', e.target.value)}
                          placeholder="VD: 01012025..."
                        />
                      </div>

                      {/* Period */}
                      <div className="form-field">
                        <label className="form-label">Kỳ báo cáo (MMYYYY)</label>
                        <input 
                          type="text"
                          className="input-control" 
                          value={scan.period || ''} 
                          onChange={(e) => handleFieldChange(scan.id, 'period', e.target.value)}
                          placeholder="VD: 062026..."
                        />
                      </div>

                      {/* Detail text */}
                      <div className="form-field">
                        <label className="form-label">Mô tả nội dung</label>
                        <input 
                          type="text"
                          className="input-control" 
                          value={scan.detail_text || ''} 
                          onChange={(e) => handleFieldChange(scan.id, 'detail_text', e.target.value)}
                          placeholder="VD: omdau, thaisan..."
                        />
                      </div>
                    </div>

                    {/* Expected Filename & Folder Path Preview */}
                    <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', padding: '10px 12px', borderRadius: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Tên file mới dự kiến:</span>
                        <div style={{ fontFamily: 'monospace', fontSize: '12.5px', color: '#db2777', fontWeight: '700', wordBreak: 'break-all', marginTop: '2px' }}>
                          {fileName}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Thư mục lưu trữ:</span>
                        <div style={{ fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-main)', wordBreak: 'break-all', marginTop: '2px' }}>
                          📁 {folderPath}
                        </div>
                      </div>
                    </div>

                    {matchedEmp && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        <div>Họ tên: <strong style={{ color: '#16a34a' }}>{matchedEmp.full_name}</strong></div>
                        <div>Công ty: <strong>{matchedEmp.company}</strong></div>
                        <div>Bộ phận: <strong>{matchedEmp.department || '—'}</strong></div>
                      </div>
                    )}

                    {/* Quick action for active item inside card */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '8px', opacity: savingId === scan.id ? 0.7 : 1 }}
                        onClick={() => handleSave(scan.id, 'Đã đổi tên', {
                          extracted_doc_type: scan.extracted_doc_type,
                          extracted_employee_code: scan.extracted_employee_code,
                          document_number: scan.document_number,
                          document_date: scan.document_date,
                          period: scan.period,
                          detail_text: scan.detail_text
                        })}
                        disabled={!isReady || savingId === scan.id}
                      >
                        {savingId === scan.id ? 'Đang lưu...' : 'Lưu & Đổi tên'}
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '8px', color: 'var(--danger)', borderColor: 'var(--danger)', opacity: savingId === scan.id ? 0.5 : 1 }}
                        onClick={() => handleSave(scan.id, 'Lỗi xử lý')}
                        disabled={savingId === scan.id}
                      >
                        Bỏ qua
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    <div>NV: <strong>{scan.extracted_employee_code || '—'}</strong> ({matchedEmp?.full_name || '—'})</div>
                    <div>Loại: <strong>{scan.extracted_doc_type || '—'}</strong></div>
                  </div>
                )}
              </div>
            );
          })}

          {reviewPendingList.length === 0 && (
            <div className="empty-state" style={{ background: 'white', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
              <CheckCircle className="empty-state-icon" style={{ color: 'var(--success)', width: '64px', height: '64px' }} />
              <h3 style={{ fontSize: '20px', color: 'var(--text-main)' }}>Đã duyệt hết tài liệu!</h3>
              <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Chị Anh Thư thật chuyên nghiệp, tất cả các hồ sơ đã được xử lý xong 🌸</p>
            </div>
          )}
        </div>

        {/* Right Side: PDF Preview Frame & Dynamic Path previews */}
        <div className="review-preview-side">
          {activeScan ? (
            <>
              <div>
                <h4 className="preview-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={18} /> Bản xem trước tài liệu
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Tệp đang mở: {activeScan.original_file_name}
                </p>
              </div>

              <div className="preview-iframe-wrapper">
                {activeScan.original_file_name.toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={`/api/uploads/${activeScan.original_file_name}#toolbar=1&navpanes=0`}
                    className="preview-iframe"
                    title="PDF Preview"
                  />
                ) : (
                  <img 
                    src={`/api/uploads/${activeScan.original_file_name}`} 
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    alt="Document Preview"
                  />
                )}
              </div>

              <div style={{ background: '#fff8f9', padding: '12px', borderRadius: '12px', border: '1px dashed var(--input-focus)' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>TÊN FILE MỚI DỰ KIẾN:</span>
                  <div style={{ fontFamily: 'monospace', fontSize: '12.5px', color: '#0d9488', fontWeight: '700', wordBreak: 'break-all' }}>
                    {getPreview(activeScan, rules, employees).fileName}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>FOLDER ĐÍCH:</span>
                  <div style={{ fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                    📁 {getPreview(activeScan, rules, employees).folderPath}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>Chọn một tệp từ danh sách bên trái để xem trực tiếp nội dung ở đây.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewTab;
