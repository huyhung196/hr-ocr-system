import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, HardDrive, Key, Save } from 'lucide-react';
import { API_URL } from '../services/api';

const SettingsTab = ({ triggerToast }) => {
  const [gdriveLink, setGdriveLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [credentialsFile, setCredentialsFile] = useState(null);
  const [tokenFile, setTokenFile] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/gdrive`);
      setGdriveLink(response.data.value || '');
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      await axios.put(`${API_URL}/settings/gdrive`, { value: gdriveLink, key: 'GDRIVE_ROOT_FOLDER_NAME' });
      
      if (credentialsFile || tokenFile) {
        const formData = new FormData();
        if (credentialsFile) formData.append('credentials_file', credentialsFile);
        if (tokenFile) formData.append('token_file', tokenFile);
        
        await axios.post(`${API_URL}/settings/gdrive/auth`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      triggerToast("Cập nhật cấu hình Google Drive thành công!", "success");
      setCredentialsFile(null);
      setTokenFile(null);
      // reset file inputs
      document.getElementById('credFile').value = '';
      document.getElementById('tokenFile').value = '';
    } catch (error) {
      console.error("Error saving settings:", error);
      triggerToast("Lỗi khi lưu cấu hình.", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tab-pane active" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <h3 style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HardDrive size={20} className="text-primary" />
          Cấu hình Google Drive
        </h3>

        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Link hoặc Tên thư mục gốc (Nơi lưu tài liệu)
          </label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Ví dụ: https://drive.google.com/drive/folders/1abc... hoặc HR_OCR_HoSo"
            value={gdriveLink}
            onChange={(e) => setGdriveLink(e.target.value)}
            style={{ width: '100%' }}
          />
          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
            Copy toàn bộ link của Folder Google Drive và dán vào đây. Hệ thống sẽ tự động bóc tách Folder ID.
          </small>
        </div>

        <h4 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#4b5563' }}>
          <Key size={18} /> Thay đổi Tài khoản Google Drive (Nâng cao)
        </h4>
        
        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
            Nếu bạn muốn chuyển sang lưu trữ bằng tài khoản Google khác, hãy tải lên file <strong>credentials.json</strong> mới (lấy từ Google Cloud Console) hoặc <strong>token.json</strong> (đã xác thực). Nếu tải lên credentials.json mới, hệ thống sẽ yêu cầu xác thực lại vào lần upload tài liệu tiếp theo.
          </p>
          
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>File credentials.json (Tùy chọn)</label>
            <input 
              id="credFile"
              type="file" 
              accept=".json"
              className="input-field"
              onChange={(e) => setCredentialsFile(e.target.files[0])}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '0' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>File token.json (Tùy chọn)</label>
            <input 
              id="tokenFile"
              type="file" 
              accept=".json"
              className="input-field"
              onChange={(e) => setTokenFile(e.target.files[0])}
            />
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={saveSettings} 
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isLoading ? 'Đang lưu...' : <><Save size={18} /> Lưu cấu hình</>}
        </button>
      </div>
    </div>
  );
};

export default SettingsTab;
