import os
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

import re

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def extract_folder_id(link_or_name):
    """
    Trích xuất Folder ID từ một link Google Drive.
    Nếu không phải link, trả về None (nghĩa là nó có thể là tên thư mục).
    """
    # Pattern 1: https://drive.google.com/drive/folders/1abc123XYZ
    match = re.search(r'/folders/([a-zA-Z0-9_-]+)', link_or_name)
    if match:
        return match.group(1)
    
    # Pattern 2: https://drive.google.com/open?id=1abc123XYZ
    match = re.search(r'id=([a-zA-Z0-9_-]+)', link_or_name)
    if match:
        return match.group(1)
        
    return None

def get_gdrive_service():
    """Shows basic usage of the Drive v3 API.
    Prints the names and ids of the first 10 files the user has access to.
    """
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    base_dir = os.path.dirname(os.path.abspath(__file__))
    token_path = os.path.join(base_dir, 'token.json')
    credentials_path = os.path.join(base_dir, 'credentials.json')
    
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(credentials_path):
                print(f"Warning: {credentials_path} not found. Please download it from Google Cloud Console.")
                return None
                
            flow = InstalledAppFlow.from_client_secrets_file(
                credentials_path, SCOPES)
            creds = flow.run_local_server(port=8080, open_browser=False)
            
        # Save the credentials for the next run
        with open(token_path, 'w') as token:
            token.write(creds.to_json())

    try:
        service = build('drive', 'v3', credentials=creds)
        return service
    except Exception as error:
        print(f'An error occurred: {error}')
        return None

def create_folder(service, folder_name, parent_id=None):
    """Create a folder and print its ID."""
    file_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    if parent_id:
        file_metadata['parents'] = [parent_id]
        
    try:
        # Check if folder exists
        query = f"mimeType='application/vnd.google-apps.folder' and name='{folder_name}'"
        if parent_id:
            query += f" and '{parent_id}' in parents"
            
        results = service.files().list(
            q=query, 
            spaces='drive', 
            fields='nextPageToken, files(id, name)',
            includeItemsFromAllDrives=True,
            supportsAllDrives=True
        ).execute()
        items = results.get('files', [])
        
        if not items:
            file = service.files().create(
                body=file_metadata, 
                fields='id',
                supportsAllDrives=True
            ).execute()
            return file.get('id')
        else:
            return items[0].get('id')
            
    except Exception as error:
        print(f'An error occurred: {error}')
        return None

def upload_to_drive(service, file_path, folder_id, new_file_name):
    """Upload a file to Google Drive."""
    try:
        file_metadata = {
            'name': new_file_name,
            'parents': [folder_id]
        }
        
        # Mime type detection
        mime_type = 'application/pdf' if file_path.lower().endswith('.pdf') else 'image/jpeg'
        
        media = MediaFileUpload(file_path, mimetype=mime_type, resumable=True)
        
        file = service.files().create(
            body=file_metadata, 
            media_body=media, 
            fields='id, webViewLink',
            supportsAllDrives=True
        ).execute()
        print(f"File ID: {file.get('id')}")
        return file.get('id'), file.get('webViewLink')
        
    except Exception as error:
        print(f'An error occurred: {error}')
        return None, None

if __name__ == '__main__':
    print("Starting Google Drive authentication...")
    service = get_gdrive_service()
    if service:
        print("Authentication successful! token.json has been saved.")
    else:
        print("Authentication failed.")


