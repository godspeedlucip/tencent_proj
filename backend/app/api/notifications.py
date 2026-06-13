from fastapi import APIRouter, Query
from ..services.notification_service import (
    get_notifications, mark_read, mark_all_read, get_unread_count,
)

router = APIRouter()


@router.get("")
def list_notifications(
    role: str = Query(...),
    user_id: str = Query(...),
    unread_only: bool = Query(False),
):
    notifs = get_notifications(role, user_id, unread_only=unread_only)
    unread = get_unread_count(role, user_id)
    return {"notifications": notifs, "unread_count": unread}


@router.post("/{notification_id}/read")
def read_notification(notification_id: str):
    mark_read(notification_id)
    return {"status": "ok"}


@router.post("/read-all")
def read_all_notifications(role: str = Query(...), user_id: str = Query(...)):
    mark_all_read(role, user_id)
    return {"status": "ok"}
