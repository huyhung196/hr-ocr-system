import { useState, useEffect } from 'react';
import { Search, RefreshCw, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import AddEmployeeModal from './AddEmployeeModal';

function EmployeesTab({
  filteredEmployees,
  empSearch,
  setEmpSearch,
  empCompanyFilter,
  setEmpCompanyFilter,
  empStatusFilter,
  setEmpStatusFilter,
  fetchEmployees,
  setSelectedEmployee
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10; // Hiển thị 10 thẻ mỗi trang (bội số của 2, 3, 4 cho grid)

  // Reset về trang 1 khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [empSearch, empCompanyFilter, empStatusFilter]);

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="glass-panel animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Cơ sở dữ liệu Nhân sự công ty</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Danh sách nhân sự chính thức dùng để đối chiếu mã nhân viên và xác định thư mục công ty. Click vào nhân viên để xem hồ sơ lưu trữ chi tiết.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={fetchEmployees}>
            <RefreshCw size={14} /> Làm mới
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Thêm nhân viên
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            className="input-control" 
            placeholder="Tìm kiếm nhân sự theo tên, mã, bộ phận, chức danh..."
            value={empSearch}
            onChange={(e) => setEmpSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-muted)' }}>Công ty:</span>
            <select 
              className="input-control"
              value={empCompanyFilter}
              onChange={(e) => setEmpCompanyFilter(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="all">Tất cả công ty</option>
              <option value="Global">Thuần Việt Global</option>
              <option value="Digital">Thuần Việt Digital</option>
              <option value="NTV">Nệm Thuần Việt</option>
              <option value="Night Dream">Night Dream</option>
              <option value="Thành Công">Nệm Thành Công</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-muted)' }}>Trạng thái:</span>
            <select 
              className="input-control"
              value={empStatusFilter}
              onChange={(e) => setEmpStatusFilter(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang làm việc</option>
              <option value="resigned">Đã nghỉ việc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Mã NV</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Họ và tên</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Công ty</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Phòng ban</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Chức danh</th>
              <th style={{ padding: '14px 10px', fontSize: '12.5px' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.map(emp => (
              <tr 
                key={emp.employee_code}
                onClick={() => setSelectedEmployee(emp)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ color: 'var(--primary-accent)', whiteSpace: 'nowrap', padding: '14px 10px', fontSize: '13.5px' }}>{emp.employee_code}</td>
                <td style={{ fontWeight: '600', whiteSpace: 'nowrap', padding: '14px 10px', fontSize: '13.5px' }}>{emp.full_name}</td>
                <td style={{ whiteSpace: 'nowrap', padding: '14px 10px', fontSize: '13px' }}>{emp.company}</td>
                <td style={{ padding: '14px 10px', fontSize: '13px' }}>{emp.department || '—'}</td>
                <td style={{ padding: '14px 10px', fontSize: '13px' }}>{emp.title || '—'}</td>
                <td style={{ whiteSpace: 'nowrap', padding: '14px 10px' }}>
                  <span className={`badge ${emp.resignation_date ? 'badge-danger' : 'badge-success'}`} style={{ padding: '4px 10px', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    {emp.resignation_date ? 'Đã nghỉ việc' : 'Đang hoạt động'}
                  </span>
                </td>
              </tr>
            ))}
            {paginatedEmployees.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Không tìm thấy nhân viên nào trùng khớp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
          <button 
            className="btn btn-outline" 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ChevronLeft size={16} /> Trang trước
          </button>
          
          <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>
            Trang {currentPage} / {totalPages}
          </span>
          
          <button 
            className="btn btn-outline" 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Trang sau <ChevronRight size={16} />
          </button>
        </div>
      )}

      {showAddModal && (
        <AddEmployeeModal 
          onClose={() => setShowAddModal(false)} 
          onSaveSuccess={() => {
            setShowAddModal(false);
            fetchEmployees();
          }} 
        />
      )}
    </div>
  );
}

export default EmployeesTab;

