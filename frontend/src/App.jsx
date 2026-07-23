import { useState, useEffect } from 'react';
import { 
  Info, Briefcase, ChevronRight, ShieldCheck, Square, CheckSquare
} from 'lucide-react';
import axios from 'axios';

// Import local services and components
import { API_URL } from './services/api';
import DashboardTab from './components/DashboardTab';
import UploadTab from './components/UploadTab';
import ReviewTab from './components/ReviewTab';
import HistoryTab from './components/HistoryTab';
import EmployeesTab from './components/EmployeesTab';
import RulesTab from './components/RulesTab';
import SettingsTab from './components/SettingsTab';
import PetalsBackground from './components/PetalsBackground';

const UNIQUE_DOC_TYPES = [
  'ĐXV', 'CV', 'CCCD', 'SYLL', 'GKSK', 'BCCC', 'TTTN', 'GPLX', 'LLTP', 
  'TTTNTT', 'TTTNTS', 'TMNV', 'HĐLĐ', 'PLHĐ', 'QĐBN', 'QĐMN', 'QĐĐC', 
  'QĐNS', 'QĐKLLĐ', 'BBNS', 'TTTV', 'BBBG', 'QĐTV', 'TBL', 'CSLT', 
  'QCLT', 'TUL', 'BCC', 'BL', 'BTC', 'QĐĐCL', 'QĐHTTN', 'MST', 'NPT', 
  'CK08', 'GTGC', 'TK_TNCN', 'QTT_TNCN', 'UQ_QTT', 'DSBHXH', 'C12', 
  'HSOM', 'HSTS', 'HSTNLD', 'CSPL', 'DSPL', 'HĐDV', 'HĐCTV', 'BBNT', 
  'SĐTC', 'JD'
];

const COMPANY_MAPPING = {
  "Thuần Việt Global": { abbr: "Global", folder: "Công ty CP Thuần Việt Global" },
  "Thuần Việt Digital": { abbr: "Digital", folder: "Công ty TNHH Thuần Việt Digital" },
  "Nệm Thuần Việt": { abbr: "NTV", folder: "Công ty Cổ phần Nệm Thuần Việt" },
  "Night Dream": { abbr: "ND", folder: "Công ty TNHH Night Dream" },
  "Nệm Thành Công": { abbr: "NTC", folder: "Công ty TNHH SX & TM Nệm Thành Công" }
};

const getCompanyInfo = (companyName) => {
  const name = companyName || '';
  for (const [key, val] of Object.entries(COMPANY_MAPPING)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) {
      return val;
    }
  }
  return { abbr: "Global", folder: "Công ty CP Thuần Việt Global" };
};

const getPreview = (scan, rules, employees) => {
  const docType = scan.extracted_doc_type;
  const empCode = scan.extracted_employee_code;
  if (!docType || !empCode) return { fileName: 'Cần chọn loại & mã NV', folderPath: 'Cần chọn loại & mã NV' };
  
  const emp = employees.find(e => e.employee_code === empCode);
  const empName = emp ? emp.full_name : '';
  const companyName = emp ? emp.company : 'Thuần Việt Global';
  
  const coInfo = getCompanyInfo(companyName);
  
  const rule = rules.find(r => r.doc_type === docType);
  const fileFormat = rule?.format || '{{CongTy}}_{{Viết tắt}}_{{HoTen}}_{{MNV}}_{{NgayVanBan}}';
  const folderTemplate = rule?.folder_path || '{{CongTy}}/01. HỒ SƠ NHÂN VIÊN/{{Mã nhân viên}}_{{Họ và tên}}';
  
  const docNum = scan.document_number || '';
  const docDate = scan.document_date || '';
  const period = scan.period || '';
  const detail = scan.detail_text || '';
  
  // Year and month extract
  const dateObj = new Date();
  let yearStr = dateObj.getFullYear().toString();
  let monthStr = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  
  if (period && period.length >= 4) {
    const yMatch = period.match(/(20\d{2})/);
    if (yMatch) yearStr = yMatch[1];
    const mMatch = period.match(/^(0[1-9]|1[0-2])/);
    if (mMatch) monthStr = mMatch[1];
  } else if (docDate && docDate.length >= 4) {
    const yMatch = docDate.match(/(20\d{2})/);
    if (yMatch) yearStr = yMatch[1];
    const mMatch = docDate.match(/^(0[1-9]|1[0-2])/);
    if (mMatch) monthStr = mMatch[1];
  }
  
  const replacements = {
    "{{CongTy}}": coInfo.abbr,
    "{{Công ty}}": coInfo.folder,
    "{{HoTen}}": empName,
    "{{Tên nhân viên}}": empName,
    "{{Họ và tên}}": empName,
    "{{MNV}}": empCode,
    "{{Mã nhân viên}}": empCode,
    "{{SoHopDong}}": docNum,
    "{{SoPhuLuc}}": docNum,
    "{{SoQuyetDinh}}": docNum,
    "{{SoBienBan}}": docNum,
    "{{MaHoSo}}": docNum,
    "{{NgayVanBan}}": docDate,
    "{{NgayHieuLuc}}": docDate,
    "{{NgayBanHanh}}": docDate,
    "{{NgayNhanViec}}": docDate,
    "{{KyLuong}}": period,
    "{{KyKeKhai}}": period,
    "{{KyBHXH}}": period,
    "{{DotChi}}": period,
    "{{TenNoiDung}}": detail,
    "{{ChiTiet}}": detail,
    "{{TenPhucLoi}}": detail,
    "{{LoaiCheDo}}": detail,
    "{{ChucDanh}}": detail,
    "{{HoNghe}}": detail,
    "{{Nam}}": yearStr,
    "{{Thang}}": monthStr,
    "{{Viết tắt}}": docType
  };
  
  let formattedFile = fileFormat;
  let formattedFolder = folderTemplate;
  
  for (const [k, v] of Object.entries(replacements)) {
    formattedFile = formattedFile.replaceAll(k, v);
    formattedFolder = formattedFolder.replaceAll(k, v);
  }
  
  // Keep original extension
  const originalName = scan.original_file_name || '';
  const lastDot = originalName.lastIndexOf('.');
  const ext = lastDot !== -1 ? originalName.substring(lastDot) : '.pdf';
  if (ext) {
    const dotIdx = formattedFile.lastIndexOf('.');
    const base = dotIdx !== -1 ? formattedFile.substring(0, dotIdx) : formattedFile;
    formattedFile = base + ext;
  }
  
  return { fileName: formattedFile, folderPath: formattedFolder };
};

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [scans, setScans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [rules, setRules] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [ocrMethod, setOcrMethod] = useState('paddle');
  
  // Search and filter states for History Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Search state for Employees Tab
  const [empSearch, setEmpSearch] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('all');
  const [empCompanyFilter, setEmpCompanyFilter] = useState('all');

  // Search state for Rules Tab
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleGroupFilter, setRuleGroupFilter] = useState('all');

  // Modal states
  const [selectedScan, setSelectedScan] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Split-view & Bulk selection states in review tab
  const [activeReviewId, setActiveReviewId] = useState(null);
  const [selectedScanIds, setSelectedScanIds] = useState([]);

  // Live Rule Tester state
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchScans();
    fetchEmployees();
    fetchRules();
  }, []);

  // Polling mechanism for background processing
  useEffect(() => {
    const pendingStatuses = ['Đang xử lý', 'Đang trích xuất văn bản (OCR)', 'Đang gọi AI phân loại'];
    const hasPending = scans.some(s => pendingStatuses.includes(s.status));
    let intervalId;
    if (hasPending) {
      intervalId = setInterval(() => {
        axios.get(`${API_URL}/scans`).then(res => {
          setScans(res.data);
          
          // Use functional state update to avoid stale closures
          setActiveReviewId(prevId => {
            const reviewPending = res.data.filter(s => s.status === 'Chờ review tên' || s.status === 'Sẵn sàng đặt tên');
            if (reviewPending.length > 0 && !prevId) {
              return reviewPending[0].id;
            }
            return prevId;
          });
        }).catch(err => console.error("Error polling scans:", err));
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [scans]);

  const fetchScans = async () => {
    try {
      const response = await axios.get(`${API_URL}/scans`);
      setScans(response.data);
      
      // Auto-set the first review scan as active if none selected
      setActiveReviewId(prevId => {
        const reviewPending = response.data.filter(s => s.status === 'Chờ review tên' || s.status === 'Sẵn sàng đặt tên');
        if (reviewPending.length > 0 && !prevId) {
          return reviewPending[0].id;
        }
        return prevId;
      });
    } catch (error) {
      console.error("Error fetching scans:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API_URL}/doc_rules`);
      setRules(response.data);
    } catch (error) {
      console.error("Error fetching rules:", error);
    }
  };

  const triggerToast = (msg, type = 'success') => {
    setActionMessage({ msg, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleFileUpload = async (e, method = 'paddle') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('ocr_method', method);
    
    try {
      await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      triggerToast("Tài liệu đang được xử lý ngầm, vui lòng chờ trong giây lát!", "success");
      fetchScans();
      document.getElementById('file-upload').value = '';
    } catch (error) {
      console.error("Error uploading files:", error);
      triggerToast("Lỗi khi tải lên file.", "danger");
    } finally {
      e.target.value = null;
      setIsUploading(false);
    }
    await fetchScans(); // Ensure data is fetched before tab switch
    setCurrentTab('review'); // Switch to review tab after upload
  };

  const updateScanStatus = async (scanId, newStatus, extraData = {}) => {
    try {
      await axios.put(`${API_URL}/scans/${scanId}`, { status: newStatus, ...extraData });
      triggerToast(newStatus === 'Đã đổi tên' ? "Đã duyệt và di chuyển file thành công!" : "Đã bỏ qua tài liệu.", "success");
      
      if (scanId === activeReviewId) {
        const reviewPending = scans.filter(s => (s.status === 'Chờ review tên' || s.status === 'Sẵn sàng đặt tên') && s.id !== scanId);
        if (reviewPending.length > 0) {
          setActiveReviewId(reviewPending[0].id);
        } else {
          setActiveReviewId(null);
        }
      }
      
      fetchScans();
    } catch (error) {
      console.error("Error updating scan:", error);
      triggerToast("Lỗi khi cập nhật trạng thái.", "danger");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedScanIds.length === 0) return;
    try {
      const response = await axios.post(`${API_URL}/scans/bulk_approve`, { scan_ids: selectedScanIds });
      const { success_count, errors } = response.data;
      if (errors.length > 0) {
        triggerToast(`Duyệt hoàn thành ${success_count} file. Lỗi: ${errors.join(', ')}`, "warning");
      } else {
        triggerToast(`Duyệt và cất trữ thành công ${success_count} tài liệu!`, "success");
      }
      setSelectedScanIds([]);
      fetchScans();
    } catch (error) {
      console.error("Error bulk approving:", error);
      triggerToast("Gặp sự cố khi thực hiện duyệt hàng loạt.", "danger");
    }
  };

  const handleFieldChange = (scanId, field, value) => {
    setScans(scans.map(s => {
      if (s.id === scanId) {
        const updated = { ...s, [field]: value };
        if (field === 'extracted_doc_type' || field === 'extracted_employee_code') {
          const docType = field === 'extracted_doc_type' ? value : s.extracted_doc_type;
          const empCode = field === 'extracted_employee_code' ? value : s.extracted_employee_code;
          updated.status = (docType && empCode) ? 'Sẵn sàng đặt tên' : 'Chờ review tên';
        }
        return updated;
      }
      return s;
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Live Rule Tester client-side handler
  const handleTestTextChange = (e) => {
    const text = e.target.value;
    setTestText(text);
    if (!text.trim()) {
      setTestResult(null);
      return;
    }
    
    const cleanText = text.toLowerCase();
    let matched = null;
    
    for (const r of rules) {
      if (!r.required_phrases) continue;
      
      const partsAnd = r.required_phrases.toLowerCase().split(';');
      const isMatch = partsAnd.every(part => {
        const partsOr = part.split('|').map(p => p.trim());
        return partsOr.some(p => cleanText.includes(p));
      });
      
      let isExcluded = false;
      if (r.excluded_phrases && isMatch) {
        const partsOr = r.excluded_phrases.toLowerCase().split('|').map(p => p.trim());
        isExcluded = partsOr.some(p => cleanText.includes(p));
      }
      
      if (isMatch && !isExcluded) {
        matched = r;
        break;
      }
    }
    
    setTestResult(matched);
  };

  // Filters for History scans
  const filteredHistoryScans = scans.filter(scan => {
    const matchesSearch = 
      scan.original_file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.new_file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.extracted_employee_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.extracted_doc_type?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || scan.status === statusFilter;
      
    return matchesSearch && matchesStatus;
  });

  // Filters for Employees tab
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      (emp.full_name || '').toLowerCase().includes(empSearch.toLowerCase()) ||
      (emp.employee_code || '').toLowerCase().includes(empSearch.toLowerCase()) ||
      (emp.company || '').toLowerCase().includes(empSearch.toLowerCase()) ||
      (emp.department || '').toLowerCase().includes(empSearch.toLowerCase()) ||
      (emp.title || '').toLowerCase().includes(empSearch.toLowerCase());
      
    const matchesStatus = 
      empStatusFilter === 'all' || 
      (empStatusFilter === 'active' && emp.resignation_date === null) ||
      (empStatusFilter === 'resigned' && emp.resignation_date !== null);

    const matchesCompany =
      empCompanyFilter === 'all' ||
      emp.company?.toLowerCase().includes(empCompanyFilter.toLowerCase());
      
    return matchesSearch && matchesStatus && matchesCompany;
  });

  // Filters for Rules tab
  const filteredRules = rules.filter(r => {
    const matchesSearch = 
      r.doc_type?.toLowerCase().includes(ruleSearch.toLowerCase()) ||
      r.keyword?.toLowerCase().includes(ruleSearch.toLowerCase()) ||
      r.required_phrases?.toLowerCase().includes(ruleSearch.toLowerCase());

    const matchesGroup = 
      ruleGroupFilter === 'all' || 
      (ruleGroupFilter === 'nhansu' && r.folder_path?.includes('HỒ SƠ NHÂN VIÊN')) ||
      (ruleGroupFilter === 'luong' && r.folder_path?.includes('HỒ SƠ LƯƠNG')) ||
      (ruleGroupFilter === 'thue' && r.folder_path?.includes('THUẾ TNCN')) ||
      (ruleGroupFilter === 'bhxh' && r.folder_path?.includes('BẢO HIỂM XÃ HỘI')) ||
      (ruleGroupFilter === 'khac' && !r.folder_path?.includes('NHÂN VIÊN') && !r.folder_path?.includes('LƯƠNG') && !r.folder_path?.includes('THUẾ') && !r.folder_path?.includes('BẢO HIỂM'));

    return matchesSearch && matchesGroup;
  });

  // KPI Calculations
  const totalScanned = scans.length;
  const reviewPendingList = scans.filter(s => s.status === 'Chờ review tên' || s.status === 'Sẵn sàng đặt tên');
  const totalPending = reviewPendingList.length;
  const totalSuccess = scans.filter(s => s.status === 'Đã đổi tên').length;
  const totalErrors = scans.filter(s => s.status === 'Lỗi xử lý' || s.status === 'Lỗi lưu file local').length;
  const completionPercentage = totalScanned > 0 ? Math.round((totalSuccess / totalScanned) * 100) : 0;

  // Group stats for SVG Dashboard charts
  const categoryStats = {
    "Hồ sơ nhân thân": scans.filter(s => s.status === 'Đã đổi tên' && s.folder_path?.includes('HỒ SƠ NHÂN VIÊN')).length,
    "Hồ sơ lương": scans.filter(s => s.status === 'Đã đổi tên' && s.folder_path?.includes('HỒ SƠ LƯƠNG')).length,
    "Thuế TNCN": scans.filter(s => s.status === 'Đã đổi tên' && s.folder_path?.includes('THUẾ TNCN')).length,
    "Bảo hiểm xã hội": scans.filter(s => s.status === 'Đã đổi tên' && s.folder_path?.includes('BẢO HIỂM XÃ HỘI')).length,
    "Khác/Dịch vụ": scans.filter(s => s.status === 'Đã đổi tên' && (!s.folder_path?.includes('NHÂN VIÊN') && !s.folder_path?.includes('LƯƠNG') && !s.folder_path?.includes('THUẾ') && !s.folder_path?.includes('BẢO HIỂM'))).length
  };

  const maxStatVal = Math.max(...Object.values(categoryStats), 1);

  return (
    <div className="app-container">
      <PetalsBackground />
      
      {/* Toast Alert Message Banner */}
      {actionMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          padding: '16px 24px',
          borderRadius: '12px',
          backgroundColor: actionMessage.type === 'success' ? '#f0fdf4' : actionMessage.type === 'warning' ? '#fff7ed' : '#fff1f2',
          border: `1px solid ${actionMessage.type === 'success' ? '#bbf7d0' : actionMessage.type === 'warning' ? '#ffedd5' : '#ffe4e6'}`,
          color: actionMessage.type === 'success' ? '#16a34a' : actionMessage.type === 'warning' ? '#ea580c' : '#e11d48',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: '600',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <ShieldCheck size={20} /> {actionMessage.msg}
        </div>
      )}

      {/* Header section with Nexus logo */}
      <header className="header">
        <div className="brand-section">
          <h1>🌸 HR Nexus Office</h1>
        </div>
        
        <nav className="nav-links">
          <a 
            href="#" 
            className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setCurrentTab('dashboard'); }}
          >
            Dashboard
          </a>
          <a 
            href="#" 
            className={`nav-link ${currentTab === 'upload' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setCurrentTab('upload'); }}
          >
            Tải lên
          </a>
          <a 
            href="#" 
            className={`nav-link ${currentTab === 'review' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setCurrentTab('review'); }}
          >
            Soát xét ({totalPending})
          </a>
          <a 
            href="#" 
            className={`nav-link ${currentTab === 'history' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setCurrentTab('history'); }}
          >
            Lịch sử
          </a>
          <a 
            href="#" 
            className={`nav-link ${currentTab === 'employees' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setCurrentTab('employees'); }}
          >
            Nhân sự ({employees.length})
          </a>
          <a 
            href="#" 
            className={`nav-link ${currentTab === 'rules' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setCurrentTab('rules'); }}
          >
            Quy tắc ({rules.length})
          </a>
          <a 
            href="#" 
            className={`nav-link ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setCurrentTab('settings'); }}
          >
            Cài đặt
          </a>
        </nav>

        <div className="welcome-profile">
          <div className="avatar">AT</div>
          <div className="welcome-text">Xin chào Lê Anh Thư 🌸</div>
        </div>
      </header>

      <main>
        {/* Render Active Tab Component */}
        {currentTab === 'dashboard' && (
          <DashboardTab 
            scans={scans}
            employees={employees}
            fetchScans={fetchScans}
            formatDate={formatDate}
            totalScanned={totalScanned}
            totalPending={totalPending}
            totalSuccess={totalSuccess}
            totalErrors={totalErrors}
            completionPercentage={completionPercentage}
            categoryStats={categoryStats}
            maxStatVal={maxStatVal}
          />
        )}

        {currentTab === 'upload' && (
          <UploadTab 
            isUploading={isUploading}
            handleFileUpload={(e) => handleFileUpload(e, ocrMethod)}
            ocrMethod={ocrMethod}
            setOcrMethod={setOcrMethod}
          />
        )}

        {currentTab === 'review' && (
          <ReviewTab 
            scans={scans}
            employees={employees}
            rules={rules}
            fetchScans={fetchScans}
            updateScanStatus={updateScanStatus}
            handleBulkApprove={handleBulkApprove}
            handleFieldChange={handleFieldChange}
            getPreview={getPreview}
            UNIQUE_DOC_TYPES={UNIQUE_DOC_TYPES}
            activeReviewId={activeReviewId}
            setActiveReviewId={setActiveReviewId}
            selectedScanIds={selectedScanIds}
            setSelectedScanIds={setSelectedScanIds}
          />
        )}

        {currentTab === 'history' && (
          <HistoryTab 
            filteredHistoryScans={filteredHistoryScans}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            fetchScans={fetchScans}
            formatDate={formatDate}
            setSelectedScan={setSelectedScan}
          />
        )}

        {currentTab === 'employees' && (
          <EmployeesTab 
            filteredEmployees={filteredEmployees}
            empSearch={empSearch}
            setEmpSearch={setEmpSearch}
            empCompanyFilter={empCompanyFilter}
            setEmpCompanyFilter={setEmpCompanyFilter}
            empStatusFilter={empStatusFilter}
            setEmpStatusFilter={setEmpStatusFilter}
            fetchEmployees={fetchEmployees}
            setSelectedEmployee={setSelectedEmployee}
            triggerToast={triggerToast}
          />
        )}

        {currentTab === 'rules' && (
          <RulesTab 
            filteredRules={filteredRules}
            ruleSearch={ruleSearch}
            setRuleSearch={setRuleSearch}
            ruleGroupFilter={ruleGroupFilter}
            setRuleGroupFilter={setRuleGroupFilter}
            fetchRules={fetchRules}
            testText={testText}
            handleTestTextChange={handleTestTextChange}
            testResult={testResult}
            triggerToast={triggerToast}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsTab 
            triggerToast={triggerToast}
            fetchEmployees={fetchEmployees}
            fetchRules={fetchRules}
          />
        )}
      </main>

      {/* POPUP DETAIL MODAL FOR A SINGLE SCAN LOG */}
      {selectedScan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(76, 45, 56, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2500,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '600px',
            background: 'white',
            border: '1px solid #fda4af',
            boxShadow: '0 20px 50px rgba(244, 63, 94, 0.15)',
            position: 'relative'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--primary-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={20} /> Chi tiết Log tài liệu #{selectedScan.id}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '12px 16px', fontSize: '14px' }}>
              <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Tên file gốc:</div>
              <div style={{ fontWeight: '500', wordBreak: 'break-all' }}>{selectedScan.original_file_name}</div>

              <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Thời gian quét:</div>
              <div>{formatDate(selectedScan.created_at)}</div>

              <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Trạng thái:</div>
              <div>
                <span className={`badge ${
                  selectedScan.status === 'Đã đổi tên' ? 'badge-success' :
                  selectedScan.status === 'Lỗi xử lý' ? 'badge-danger' :
                  selectedScan.status === 'Sẵn sàng đặt tên' ? 'badge-info' : 'badge-warning'
                }`}>
                  {selectedScan.status}
                </span>
              </div>

              <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Loại giấy tờ (Mã):</div>
              <div style={{ fontWeight: '700', color: 'var(--primary-accent)' }}>{selectedScan.extracted_doc_type || '—'}</div>

              <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Mã nhân viên:</div>
              <div style={{ fontWeight: '700' }}>{selectedScan.extracted_employee_code || '—'}</div>

              <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Số quyết định / HĐ:</div>
              <div style={{ fontWeight: '500' }}>{selectedScan.document_number || '—'}</div>

              <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Ngày văn bản:</div>
              <div style={{ fontWeight: '500' }}>{selectedScan.document_date || '—'}</div>

              <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Kỳ báo cáo/lương:</div>
              <div style={{ fontWeight: '500' }}>{selectedScan.period || '—'}</div>

              <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Mô tả chi tiết:</div>
              <div style={{ fontWeight: '500' }}>{selectedScan.detail_text || '—'}</div>

              {selectedScan.new_file_name && (
                <>
                  <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Tên file lưu trữ mới:</div>
                  <div style={{ fontWeight: '700', color: 'var(--success)', wordBreak: 'break-all' }}>{selectedScan.new_file_name}</div>
                </>
              )}

              {selectedScan.folder_path && (
                <>
                  <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Thư mục phân loại:</div>
                  <div className="path-text" title={selectedScan.folder_path} style={{ maxWidth: 'none', display: 'block', whiteSpace: 'normal' }}>
                    {selectedScan.folder_path}
                  </div>
                </>
              )}

              {selectedScan.drive_file_url && (
                <>
                  <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Đường dẫn tải file:</div>
                  <div>
                    <a 
                      href={selectedScan.drive_file_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'var(--primary-accent)', fontWeight: '700', textDecoration: 'underline', wordBreak: 'break-all' }}
                    >
                      Mở / Xem tệp lưu trữ 📄
                    </a>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelectedScan(null)}>
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED EMPLOYEE DOSSIER OVERLAY MODAL */}
      {selectedEmployee && (
        <div className="dossier-modal-overlay" onClick={() => setSelectedEmployee(null)}>
          <div className="dossier-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="dossier-profile-header">
              <div className="dossier-avatar-large">
                {selectedEmployee.full_name ? selectedEmployee.full_name.split(' ').pop().substring(0, 2).toUpperCase() : 'EE'}
              </div>
              <div className="dossier-name-title">
                <div className="dossier-fullname">{selectedEmployee.full_name}</div>
                <div className="dossier-badge-container">
                  <span className="tester-badge-pill" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-accent)', border: 'none' }}>
                    Mã NV: {selectedEmployee.employee_code}
                  </span>
                  <span className={`badge ${selectedEmployee.resignation_date ? 'badge-danger' : 'badge-success'}`} style={{ padding: '4px 10px', fontSize: '11.5px' }}>
                    {selectedEmployee.resignation_date ? `Nghỉ việc từ ${selectedEmployee.resignation_date}` : 'Đang làm việc'}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid of full Employee details */}
            <div className="dossier-details-grid">
              <div className="dossier-info-field">
                <span className="dossier-info-label">CÔNG TY:</span>
                <span className="dossier-info-val">{selectedEmployee.company}</span>
              </div>
              <div className="dossier-info-field">
                <span className="dossier-info-label">BỘ PHẬN:</span>
                <span className="dossier-info-val">{selectedEmployee.department || '—'}</span>
              </div>
              <div className="dossier-info-field">
                <span className="dossier-info-label">TEAM:</span>
                <span className="dossier-info-val">{selectedEmployee.team || '—'}</span>
              </div>
              <div className="dossier-info-field">
                <span className="dossier-info-label">CHỨC DANH:</span>
                <span className="dossier-info-val">{selectedEmployee.title || '—'}</span>
              </div>
              <div className="dossier-info-field">
                <span className="dossier-info-label">SỐ CCCD:</span>
                <span className="dossier-info-val">{selectedEmployee.cccd || '—'}</span>
              </div>
              <div className="dossier-info-field">
                <span className="dossier-info-label">MÃ BHXH:</span>
                <span className="dossier-info-val">{selectedEmployee.bhxh || '—'}</span>
              </div>
              <div className="dossier-info-field">
                <span className="dossier-info-label">NGÀY VÀO LÀM:</span>
                <span className="dossier-info-val">{selectedEmployee.join_date || '—'}</span>
              </div>
              <div className="dossier-info-field">
                <span className="dossier-info-label">GHI CHÚ:</span>
                <span className="dossier-info-val">{selectedEmployee.notes || '—'}</span>
              </div>
            </div>

            {/* Dossier Document Lists saved for this employee */}
            <div className="dossier-docs-section">
              <h4 className="dossier-docs-title">
                <Briefcase size={20} /> Hồ sơ tài liệu lưu trữ ({
                  scans.filter(s => s.extracted_employee_code === selectedEmployee.employee_code && s.status === 'Đã đổi tên').length
                })
              </h4>
              
              <div className="dossier-docs-list">
                {scans
                  .filter(s => s.extracted_employee_code === selectedEmployee.employee_code && s.status === 'Đã đổi tên')
                  .map(scan => (
                    <div className="dossier-doc-card" key={scan.id}>
                      <div className="dossier-doc-info">
                        <div className="dossier-doc-type-icon">{scan.extracted_doc_type}</div>
                        <div className="dossier-doc-meta">
                          <span className="dossier-doc-name" title={scan.new_file_name}>{scan.new_file_name}</span>
                          <span className="dossier-doc-path" title={scan.folder_path}>📁 {scan.folder_path}</span>
                        </div>
                      </div>
                      
                      {scan.drive_file_url && (
                        <a 
                          href={scan.drive_file_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-outline" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Mở file
                        </a>
                      )}
                    </div>
                  ))
                }

                {scans.filter(s => s.extracted_employee_code === selectedEmployee.employee_code && s.status === 'Đã đổi tên').length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                    Chưa có tài liệu chính thức nào được lưu trữ cho nhân sự này.
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelectedEmployee(null)}>
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
      <footer style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '14px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
        @ by Hưng huy cao
      </footer>
    </div>
  );
}

export default App;
