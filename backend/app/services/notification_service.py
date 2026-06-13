"""Notification creation and query logic."""
from ..models import SessionLocal
from ..models.notification import Notification, NotificationType, NotificationPriority


def create_notification(
    recipient_role: str,
    recipient_id: str,
    type_: NotificationType,
    title: str,
    body: str,
    priority: NotificationPriority = NotificationPriority.medium,
    action_link: str | None = None,
) -> Notification:
    db = SessionLocal()
    try:
        notif = Notification(
            recipient_role=recipient_role,
            recipient_id=recipient_id,
            type=type_,
            title=title,
            body=body,
            priority=priority,
            action_link=action_link,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif
    finally:
        db.close()


def get_notifications(role: str, user_id: str, unread_only: bool = False, limit: int = 50) -> list[dict]:
    db = SessionLocal()
    try:
        q = db.query(Notification).filter(
            Notification.recipient_role == role,
            Notification.recipient_id == user_id,
        ).order_by(Notification.created_at.desc())
        if unread_only:
            q = q.filter(Notification.read == False)
        notifs = q.limit(limit).all()
        return [
            {
                "id": n.id, "type": n.type.value, "title": n.title, "body": n.body,
                "priority": n.priority.value, "read": n.read, "action_link": n.action_link,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifs
        ]
    finally:
        db.close()


def mark_read(notification_id: str) -> None:
    db = SessionLocal()
    try:
        n = db.query(Notification).filter(Notification.id == notification_id).first()
        if n:
            n.read = True
            db.commit()
    finally:
        db.close()


def mark_all_read(role: str, user_id: str) -> None:
    db = SessionLocal()
    try:
        db.query(Notification).filter(
            Notification.recipient_role == role,
            Notification.recipient_id == user_id,
            Notification.read == False,
        ).update({"read": True})
        db.commit()
    finally:
        db.close()


def get_unread_count(role: str, user_id: str) -> int:
    db = SessionLocal()
    try:
        return db.query(Notification).filter(
            Notification.recipient_role == role,
            Notification.recipient_id == user_id,
            Notification.read == False,
        ).count()
    finally:
        db.close()
