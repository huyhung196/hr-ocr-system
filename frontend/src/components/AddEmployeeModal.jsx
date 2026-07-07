import { useState, useEffect } from 'react';
import { X, Plus, Save } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../services/api';

function AddEmployeeModal({ onClose, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    employee_code: '',
    full_name: '',
    company: '',
    department: '',
    title: '',
    team: '',
    status: 'Chính thức',
    bhxh: '',
    cccd: '',
    join_date: '',
    resignation_date: '',
    notes: ''
  });

  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [compsRes, deptsRes, posRes] = await Promise.all([
        axios.get(`${API_URL}/companies`),
        axios.get(`${API_URL}/departments`),
        axios.get(`${API_URL}/positions`)
      ]);
      setCompanies(compsRes.data);
      setDepartments(deptsRes.data);
      setPositions(posRes.data);
    } catch (err) {
      console.error("Error fetching options:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOption = async (type) => {
    const name = prompt(`Nhập tên ${type === 'company' ? 'công ty' : type === 'department' ? 'phòng ban' : 'vị trí/chức danh'} mới:`);
    if (!name || !name.trim()) return;

    try {
      let endpoint = '';
      if (type === 'company') endpoint = '/companies';
      else if (type === 'department') endpoint = '/departments';
      else if (type === 'position') endpoint = '/positions';

      const payload = { name: name.trim() };
      
      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      
      if (type === 'company') {
        setCompanies([...companies, res.data]);
        setFormData(prev => ({ ...prev, company: res.data.name }));
      } else if (type === 'department') {
        setDepartments([...departments, res.data]);
        setFormData(prev => ({ ...prev, department: res.data.name }));
      } else if (type === 'position') {
        setPositions([...positions, res.data]);
        setFormData(prev => ({ ...prev, title: res.data.name }));
      }
    } catch (err) {
      alert(`Lỗi khi thêm: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.employee_code || !formData.full_name) {
      setError("Vui lòng nhập Mã nhân viên và Họ tên.");
      return;
    }
    
    setLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.join_date) delete payload.join_date;
      if (!payload.resignation_date) delete payload.resignation_date;
      
      await axios.post(`${API_URL}/employees`, payload);
      onSaveSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Đã xảy ra lỗi khi lưu nhân viên.");
      setLoading(false);
    }
  };

  return (
    <div className="dossier-modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '5vh' }}>
      <div className="dossier-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '20px', color: 'var(--primary-accent)', margin: 0 }}>Thêm nhân viên mới</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Mã nhân viên *</label>
              <input type="text" className="input-control" name="employee_code" value={formData.employee_code} onChange={handleChange} required placeholder="VD: NV001" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Họ và tên *</label>
              <input type="text" className="input-control" name="full_name" value={formData.full_name} onChange={handleChange} required placeholder="VD: Nguyễn Văn A" style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Công ty</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="input-control" name="company" value={formData.company} onChange={handleChange} style={{ flex: 1 }}>
                  <option value="">Chọn công ty...</option>
                  <option value="Thuần Việt Global">Thuần Việt Global</option>
                  <option value="Thuần Việt Digital">Thuần Việt Digital</option>
                  <option value="Nệm Thuần Việt">Nệm Thuần Việt</option>
                  <option value="Night Dream">Night Dream</option>
                  <option value="Nệm Thành Công">Nệm Thành Công</option>
                  {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <button type="button" className="btn btn-outline" onClick={() => handleAddOption('company')} title="Thêm công ty mới" style={{ padding: '0 12px' }}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Phòng ban</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="input-control" name="department" value={formData.department} onChange={handleChange} style={{ flex: 1 }}>
                  <option value="">Chọn phòng ban...</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
                <button type="button" className="btn btn-outline" onClick={() => handleAddOption('department')} title="Thêm phòng ban mới" style={{ padding: '0 12px' }}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Vị trí / Chức danh</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="input-control" name="title" value={formData.title} onChange={handleChange} style={{ flex: 1 }}>
                  <option value="">Chọn chức danh...</option>
                  {positions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
                <button type="button" className="btn btn-outline" onClick={() => handleAddOption('position')} title="Thêm chức danh mới" style={{ padding: '0 12px' }}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Team</label>
              <input type="text" className="input-control" name="team" value={formData.team} onChange={handleChange} style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Ngày vào làm</label>
              <input type="date" className="input-control" name="join_date" value={formData.join_date} onChange={handleChange} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Trạng thái</label>
              <select className="input-control" name="status" value={formData.status} onChange={handleChange} style={{ width: '100%' }}>
                <option value="Chính thức">Chính thức</option>
                <option value="Thử việc">Thử việc</option>
                <option value="Đã nghỉ việc">Đã nghỉ việc</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} /> {loading ? 'Đang lưu...' : 'Lưu nhân viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddEmployeeModal;
