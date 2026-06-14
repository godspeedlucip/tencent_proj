import os
import uuid
import oss2


def _get_bucket():
    auth = oss2.Auth(
        os.environ["OSS_ACCESS_KEY_ID"],
        os.environ["OSS_ACCESS_KEY_SECRET"],
    )
    return oss2.Bucket(auth, os.environ["OSS_ENDPOINT"], os.environ["OSS_BUCKET"])


def upload_file(file_content: bytes, original_filename: str, content_type: str) -> tuple[str, str]:
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    object_name = f"uploads/{uuid.uuid4()}.{ext}"
    bucket = _get_bucket()
    bucket.put_object(object_name, file_content, headers={"Content-Type": content_type})
    url = f"https://{os.environ['OSS_BUCKET']}.{os.environ['OSS_ENDPOINT']}/{object_name}"
    return url, original_filename
