from fastapi import APIRouter, HTTPException, UploadFile, File

router = APIRouter()

ALLOWED_TYPES = {
    "image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"
}
MAX_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("")
async def upload_file_endpoint(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "不支持的文件类型，仅允许 JPG/PNG/GIF/WebP/PDF")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "文件超过 5MB 限制")

    from ..services.oss_service import upload_file
    url, name = upload_file(content, file.filename or "file", file.content_type)
    return {"url": url, "name": name}
