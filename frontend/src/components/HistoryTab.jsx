import { Search, RefreshCw } from 'lucide-react';

function HistoryTab({
  filteredHistoryScans,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  fetchScans,
  formatDate,
  setSelectedScan
}) {
  return (
    <div className="glass-panel animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Lịch sử lưu trữ hồ sơ</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Tìm kiếm và xem lại đường dẫn lưu trữ, các thuộc tính metadata đã trích xuất của tất cả tài liệu.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchScans}>
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Search and Filters */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            className="input-control" 
            placeholder="Tìm kiếm theo file gốc, file đã đổi, mã nhân viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>Lọc trạng thái:</span>
          <select 
            className="input-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="all">Tất cả</option>
            <option value="Đã đổi tên">Đã đổi tên (Thành công)</option>
            <option value="Chờ review tên">Chờ review tên</option>
            <option value="Sẵn sàng đặt tên">Sẵn sàng đặt tên</option>
            <option value="Lỗi xử lý">Đã bỏ qua / Lỗi</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Thời gian quét</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>File gốc</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Loại</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Mã NV</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Tên file mới</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Thư mục lưu trữ</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Trạng thái</th>
              <th style={{ textAlign: 'center', padding: '14px 10px', fontSize: '12.5px' }}>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistoryScans.map(scan => (
              <tr key={scan.id}>
                <td style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '14px 10px', whiteSpace: 'nowrap' }}>{formatDate(scan.created_at)}</td>
                <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500', padding: '14px 10px', fontSize: '13px' }}>
                  <span title={scan.original_file_name}>{scan.original_file_name}</span>
                </td>
                <td style={{ fontWeight: '700', color: 'var(--primary-accent)', padding: '14px 10px', fontSize: '13px', whiteSpace: 'nowrap' }}>{scan.extracted_doc_type || '—'}</td>
                <td style={{ padding: '14px 10px', fontSize: '13px', whiteSpace: 'nowrap' }}>{scan.extracted_employee_code || '—'}</td>
                <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: '600', padding: '14px 10px' }}>
                  <span title={scan.new_file_name}>{scan.new_file_name || '—'}</span>
                </td>
                <td style={{ padding: '14px 10px', fontSize: '13px', maxWidth: '200px' }}>
                  {scan.folder_path ? (
                    <span className="path-text" title={scan.folder_path}>{scan.folder_path}</span>
                  ) : '—'}
                </td>
                <td style={{ padding: '14px 10px', whiteSpace: 'nowrap' }}>
                  <span className={`badge ${
                    scan.status === 'Đã đổi tên' ? 'badge-success' :
                    scan.status === 'Lỗi xử lý' ? 'badge-danger' :
                    scan.status === 'Sẵn sàng đặt tên' ? 'badge-info' : 'badge-warning'
                  }`} style={{ padding: '4px 8px', fontSize: '11.5px' }}>
                    {scan.status}
                  </span>
                </td>
                <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    onClick={() => setSelectedScan(scan)}
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
            {filteredHistoryScans.length === 0 && (
              <tr>
                <td colSpan="8" className="empty-state">
                  Không tìm thấy tài liệu lịch sử nào trùng khớp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HistoryTab;
