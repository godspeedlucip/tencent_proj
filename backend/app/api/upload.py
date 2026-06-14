from fastapi import APIRouter, HTTPException, Request, UploadFile, File

router = APIRouter()

ALLOWED_TYPES = {
    "image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"
}
MAX_SIZE = 5 * 1024 * 1024  # 5MB

MIME_TO_EXT = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/pdf": "pdf",
}


@router.post("")
async def upload_file_endpoint(request: Request, file: UploadFile = File(...)):
    content_type = file.content_type
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {content_type}. Allowed: PNG, JPEG, GIF, WebP, PDF")

    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_SIZE:
        raise HTTPException(413, "File exceeds 5MB limit")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "File exceeds 5MB limit")

    safe_filename = f"upload.{MIME_TO_EXT[content_type]}"

    from ..services.oss_service import upload_file
    url, _ = upload_file(content, safe_filename, content_type)
    original_name = file.filename or "file"
    return {"url": url, "name": original_name}
