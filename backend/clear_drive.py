import sys
sys.path.append('/app')
from drive_api import get_gdrive_service

service = get_gdrive_service()
if service:
    query = "name='HR_OCR_HoSo' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    items = results.get('files', [])
    if items:
        folder_id = items[0]['id']
        print(f'Found folder ID: {folder_id}')
        service.files().delete(fileId=folder_id).execute()
        print('Deleted HR_OCR_HoSo from Drive successfully')
    else:
        print('No HR_OCR_HoSo folder found on Drive - already clean')
else:
    print('GDrive service failed')
