import { FileText, Clock, CheckCircle, XCircle, ClipboardList, RefreshCw } from 'lucide-react';

function DashboardTab({ 
  scans, 
  employees, 
  fetchScans, 
  formatDate,
  totalScanned,
  totalPending,
  totalSuccess,
  totalErrors,
  completionPercentage,
  categoryStats,
  maxStatVal
}) {
  return (
    <div className="glass-panel animate-fade-in">
      <h2 style={{ fontSize: '22px', color: 'var(--text-main)' }}>Tổng quan Quản lý Văn phòng HR</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
        Theo dõi tình trạng quét OCR tài liệu, phân loại lưu trữ theo sơ đồ thư mục tự động.
      </p>
      
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-title">Tổng số file đã quét</div>
            <div className="kpi-value">{totalScanned}</div>
          </div>
          <div className="kpi-icon"><FileText size={24} /></div>
        </div>
        
        <div className="kpi-card kpi-warning">
          <div>
            <div className="kpi-title">Đang chờ soát xét</div>
            <div className="kpi-value">{totalPending}</div>
          </div>
          <div className="kpi-icon"><Clock size={24} /></div>
        </div>
        
        <div className="kpi-card kpi-success">
          <div>
            <div className="kpi-title">Đã đổi tên & lưu trữ</div>
            <div className="kpi-value">{totalSuccess}</div>
          </div>
          <div className="kpi-icon"><CheckCircle size={24} /></div>
        </div>
        
        <div className="kpi-card kpi-danger">
          <div>
            <div className="kpi-title">Gặp lỗi / Bỏ qua</div>
            <div className="kpi-value">{totalErrors}</div>
          </div>
          <div className="kpi-icon"><XCircle size={24} /></div>
        </div>
      </div>

      {/* Dashboard Grid layout including SVG Charts and Stats */}
      <div className="dashboard-grid-layout">
        {/* Left Column: Recent Activity */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
          <div className="recent-activity-header" style={{ marginTop: '0', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={20} style={{ color: 'var(--primary-accent)' }} /> Hoạt động quét tài liệu gần đây
            </h3>
            <button className="btn btn-outline" style={{ padding: '8px 16px' }} onClick={fetchScans}>
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>
          
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Tên file gốc</th>
                  <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Loại (OCR)</th>
                  <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Nhân viên</th>
                  <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {scans.slice(0, 5).map(scan => {
                  const emp = employees.find(e => e.employee_code === scan.extracted_employee_code);
                  return (
                    <tr key={scan.id}>
                      <td style={{ fontWeight: '600', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '14px 10px', fontSize: '13px' }} title={scan.original_file_name}>
                        {scan.original_file_name}
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--primary-accent)', padding: '14px 10px', fontSize: '13px', whiteSpace: 'nowrap' }}>{scan.extracted_doc_type || '—'}</td>
                      <td style={{ padding: '14px 10px', fontSize: '13px', whiteSpace: 'nowrap' }}>{emp ? `${emp.employee_code} - ${emp.full_name}` : (scan.extracted_employee_code || '—')}</td>
                      <td style={{ padding: '14px 10px', whiteSpace: 'nowrap' }}>
                        <span className={`badge ${
                          scan.status === 'Đã đổi tên' ? 'badge-success' :
                          scan.status === 'Lỗi xử lý' ? 'badge-danger' :
                          scan.status === 'Sẵn sàng đặt tên' ? 'badge-info' : 'badge-warning'
                        }`} style={{ padding: '4px 8px', fontSize: '11.5px' }}>
                          {scan.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {scans.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      Chưa có tài liệu nào được quét. Hãy chuyển qua tab "Tải lên" để bắt đầu!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Visual Charts & Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SVG Ring Progress completion */}
          <div className="chart-box">
            <h4 className="chart-title-lbl">Tỷ lệ hoàn tất lưu trữ</h4>
            <div className="svg-ring-container">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f3e8eb" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--primary-accent)" strokeWidth="10" 
                  strokeDasharray={314.16} 
                  strokeDashoffset={314.16 - (314.16 * completionPercentage) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                <text x="60" y="66" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--text-main)">
                  {completionPercentage}%
                </text>
              </svg>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                <p><strong>{totalSuccess} / {totalScanned}</strong> tệp đã được duyệt và di chuyển vào sơ đồ thư mục chính thức.</p>
              </div>
            </div>
          </div>

          {/* SVG Category Bar Chart */}
          <div className="chart-box">
            <h4 className="chart-title-lbl">Cơ cấu hồ sơ đã phân loại</h4>
            <div className="progress-bar-stack">
              {Object.entries(categoryStats).map(([catName, val]) => (
                <div className="progress-row-item" key={catName}>
                  <div className="progress-lbl-grp">
                    <span>{catName}</span>
                    <span style={{ color: 'var(--primary-accent)' }}>{val} tệp</span>
                  </div>
                  <div className="progress-bar-rail">
                    <div className="progress-bar-fill-color" style={{
                      width: `${(val / maxStatVal) * 100}%`,
                      backgroundColor: catName.includes('nhân thân') ? '#f43f5e' : catName.includes('lương') ? '#0d9488' : catName.includes('Thuế') ? '#ea580c' : catName.includes('Bảo hiểm') ? '#8b5cf6' : '#ec4899'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardTab;
