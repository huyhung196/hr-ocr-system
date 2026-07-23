import drive_api
service = drive_api.get_gdrive_service()
parent_id = "18JaykqWXk3o7qpdzpJ8L9HvArTNep0Gb"
res = service.files().get(fileId=parent_id, fields="id, name, mimeType, parents, webViewLink", supportsAllDrives=True).execute()
print("PARENT DETAILS:", res)
