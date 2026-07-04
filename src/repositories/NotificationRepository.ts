import DatabaseService from '../db/database';
import { Notification } from '../models/Notification';
import { User } from '../models/User';

export interface NotificationWithActor extends Notification {
  actor: User | null;
}

export class NotificationRepository {
  private db = DatabaseService;

  async getNotifications(userId: string): Promise<NotificationWithActor[]> {
    const database = await this.db.getDatabase();
    const rows = await database.getAllAsync<any>(
      `SELECT n.*,
              u.id as u_id, u.username as u_username, u.displayName as u_displayName, u.avatarUri as u_avatarUri
       FROM notifications n
       LEFT JOIN users u ON n.actorId = u.id
       WHERE n.recipientId = ?
       ORDER BY n.createdAt DESC`,
      [userId]
    );

    return rows.map(row => ({
      id: row.id,
      recipientId: row.recipientId,
      actorId: row.actorId,
      type: row.type,
      postId: row.postId ?? undefined,
      commentId: row.commentId ?? undefined,
      message: row.message,
      isRead: row.isRead === 1,
      createdAt: row.createdAt,
      actor: row.u_id ? {
        id: row.u_id,
        username: row.u_username,
        displayName: row.u_displayName,
        avatarUri: row.u_avatarUri,
        followersCount: 0,
        followingCount: 0,
        createdAt: '',
      } as User : null,
    }));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const database = await this.db.getDatabase();
    const row = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM notifications WHERE recipientId = ? AND isRead = 0`,
      [userId]
    );
    return row?.count ?? 0;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      `UPDATE notifications SET isRead = 1 WHERE recipientId = ?`,
      [userId]
    );
  }

  async markAsRead(notificationId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      `UPDATE notifications SET isRead = 1 WHERE id = ?`,
      [notificationId]
    );
  }
}
