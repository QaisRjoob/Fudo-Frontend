import * as SQLite from 'expo-sqlite';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initializeDatabase(): Promise<void> {
    if (this.db) return;

    this.db = await SQLite.openDatabaseAsync('fudo.db');
    await this.createTables();
    await this.runMigrations();
  }

  async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.initializeDatabase();
    }
    return this.db!;
  }

  private async createTables(): Promise<void> {
    const db = await this.getDatabase();

    try {
      // Users table (email and password included)
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT,
          password TEXT,
          displayName TEXT,
          bio TEXT,
          avatarUri TEXT,
          followersCount INTEGER DEFAULT 0,
          followingCount INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating users table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY,
          authorId TEXT NOT NULL,
          caption TEXT,
          likesCount INTEGER DEFAULT 0,
          commentsCount INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT,
          isArchived INTEGER DEFAULT 0,
          uploadStatus TEXT DEFAULT 'uploaded',
          FOREIGN KEY (authorId) REFERENCES users(id)
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating posts table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS media (
          id TEXT PRIMARY KEY,
          postId TEXT,
          storyId TEXT,
          messageId TEXT,
          type TEXT NOT NULL,
          remoteUri TEXT,
          localUri TEXT,
          thumbnailUri TEXT,
          \`order\` INTEGER DEFAULT 0,
          width INTEGER,
          height INTEGER,
          FOREIGN KEY (postId) REFERENCES posts(id),
          FOREIGN KEY (storyId) REFERENCES stories(id),
          FOREIGN KEY (messageId) REFERENCES messages(id)
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating media table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          postId TEXT,
          storyId TEXT,
          authorId TEXT NOT NULL,
          text TEXT NOT NULL,
          likesCount INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT,
          replyToCommentId TEXT,
          FOREIGN KEY (postId) REFERENCES posts(id),
          FOREIGN KEY (storyId) REFERENCES stories(id),
          FOREIGN KEY (authorId) REFERENCES users(id),
          FOREIGN KEY (replyToCommentId) REFERENCES comments(id)
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating comments table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS stories (
          id TEXT PRIMARY KEY,
          authorId TEXT NOT NULL,
          mediaId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          expiresAt TEXT,
          views INTEGER DEFAULT 0,
          repliesCount INTEGER DEFAULT 0,
          isHighlighted INTEGER DEFAULT 0,
          highlightId TEXT,
          uploadStatus TEXT DEFAULT 'uploaded',
          FOREIGN KEY (authorId) REFERENCES users(id)
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating stories table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS story_highlights (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          title TEXT NOT NULL,
          coverUri TEXT,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id)
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating story_highlights table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          participantIds TEXT NOT NULL,
          unreadCount INTEGER DEFAULT 0,
          updatedAt TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating conversations table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversationId TEXT NOT NULL,
          senderId TEXT NOT NULL,
          text TEXT,
          status TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          editedAt TEXT,
          replyToMessageId TEXT,
          FOREIGN KEY (conversationId) REFERENCES conversations(id),
          FOREIGN KEY (senderId) REFERENCES users(id),
          FOREIGN KEY (replyToMessageId) REFERENCES messages(id)
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating messages table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS follows (
          followerId TEXT NOT NULL,
          followingId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          PRIMARY KEY (followerId, followingId),
          FOREIGN KEY (followerId) REFERENCES users(id),
          FOREIGN KEY (followingId) REFERENCES users(id)
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating follows table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS likes (
          userId TEXT NOT NULL,
          postId TEXT,
          commentId TEXT,
          createdAt TEXT NOT NULL,
          PRIMARY KEY (userId, postId, commentId),
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (postId) REFERENCES posts(id),
          FOREIGN KEY (commentId) REFERENCES comments(id)
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating likes table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS saved_posts (
          userId TEXT NOT NULL,
          postId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          PRIMARY KEY (userId, postId),
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (postId) REFERENCES posts(id)
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating saved_posts table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id TEXT PRIMARY KEY,
          entityType TEXT NOT NULL,
          entityId TEXT NOT NULL,
          eventType TEXT NOT NULL,
          userId TEXT,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id)
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating analytics_events table:', e);
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_settings (
          userId TEXT PRIMARY KEY,
          notificationsEnabled INTEGER DEFAULT 1,
          privateAccount INTEGER DEFAULT 0,
          showActivityStatus INTEGER DEFAULT 1,
          FOREIGN KEY (userId) REFERENCES users(id)
        );
      `);
    } catch (e) {
      console.error('[DB] Error creating user_settings table:', e);
    }

    // Indexes
    try {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_posts_authorId ON posts(authorId);
        CREATE INDEX IF NOT EXISTS idx_posts_createdAt ON posts(createdAt DESC);
        CREATE INDEX IF NOT EXISTS idx_media_postId ON media(postId);
        CREATE INDEX IF NOT EXISTS idx_media_storyId ON media(storyId);
        CREATE INDEX IF NOT EXISTS idx_media_order ON media(postId, \`order\`);
        CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments(postId);
        CREATE INDEX IF NOT EXISTS idx_comments_storyId ON comments(storyId);
        CREATE INDEX IF NOT EXISTS idx_stories_authorId ON stories(authorId);
        CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages(conversationId);
        CREATE INDEX IF NOT EXISTS idx_follows_followerId ON follows(followerId);
        CREATE INDEX IF NOT EXISTS idx_follows_followingId ON follows(followingId);
        CREATE INDEX IF NOT EXISTS idx_analytics_entityId ON analytics_events(entityId);
        CREATE INDEX IF NOT EXISTS idx_likes_postId ON likes(postId);
        CREATE INDEX IF NOT EXISTS idx_saved_posts_userId ON saved_posts(userId);
      `);
    } catch (e) {
      console.error('[DB] Error creating indexes:', e);
    }
  }

  private async runMigrations(): Promise<void> {
    const db = await this.getDatabase();

    // Migration: add email column if missing
    try {
      await db.execAsync(`ALTER TABLE users ADD COLUMN email TEXT;`);
    } catch (_) {
      // Column already exists — ignore
    }

    // Migration: add password column if missing
    try {
      await db.execAsync(`ALTER TABLE users ADD COLUMN password TEXT;`);
    } catch (_) {}

    // v2: recipe fields on posts
    const silentAlter = async (sql: string) => { try { await db.execAsync(sql); } catch (_) {} };
    await silentAlter(`ALTER TABLE posts ADD COLUMN title TEXT;`);
    await silentAlter(`ALTER TABLE posts ADD COLUMN cookTime INTEGER;`);
    await silentAlter(`ALTER TABLE posts ADD COLUMN servings INTEGER;`);
    await silentAlter(`ALTER TABLE posts ADD COLUMN ingredients TEXT;`);
    await silentAlter(`ALTER TABLE posts ADD COLUMN steps TEXT;`);
    await silentAlter(`ALTER TABLE posts ADD COLUMN tags TEXT;`);
    await silentAlter(`ALTER TABLE posts ADD COLUMN location TEXT;`);

    // v3: collections
    await silentAlter(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        coverUri TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);
    await silentAlter(`
      CREATE TABLE IF NOT EXISTS collection_posts (
        collectionId TEXT NOT NULL,
        postId TEXT NOT NULL,
        addedAt TEXT NOT NULL,
        PRIMARY KEY (collectionId, postId),
        FOREIGN KEY (collectionId) REFERENCES collections(id),
        FOREIGN KEY (postId) REFERENCES posts(id)
      );
    `);

    // v5: shared post in messages
    await silentAlter(`ALTER TABLE messages ADD COLUMN sharedPostId TEXT;`);

    // v7: social links on users
    await silentAlter(`ALTER TABLE users ADD COLUMN socialLinks TEXT;`);

    // v6: notifications
    await silentAlter(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        recipientId TEXT NOT NULL,
        actorId TEXT NOT NULL,
        type TEXT NOT NULL,
        postId TEXT,
        commentId TEXT,
        message TEXT NOT NULL,
        isRead INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (recipientId) REFERENCES users(id),
        FOREIGN KEY (actorId) REFERENCES users(id)
      );
    `);

    // v4: blocked users
    await silentAlter(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        userId TEXT NOT NULL,
        blockedId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        PRIMARY KEY (userId, blockedId),
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (blockedId) REFERENCES users(id)
      );
    `);

    // v8: extended recipe fields
    await silentAlter(`ALTER TABLE posts ADD COLUMN prepTime INTEGER;`);
    await silentAlter(`ALTER TABLE posts ADD COLUMN difficulty TEXT;`);
    await silentAlter(`ALTER TABLE posts ADD COLUMN calories INTEGER;`);
    await silentAlter(`ALTER TABLE posts ADD COLUMN protein INTEGER;`);
    await silentAlter(`ALTER TABLE posts ADD COLUMN carbs INTEGER;`);
    await silentAlter(`ALTER TABLE posts ADD COLUMN fat INTEGER;`);

    // v9: user gender
    await silentAlter(`ALTER TABLE users ADD COLUMN gender TEXT;`);
  }

  async clearDatabase(): Promise<void> {
    const db = await this.getDatabase();

    await db.execAsync(`
      DROP TABLE IF EXISTS user_settings;
      DROP TABLE IF EXISTS analytics_events;
      DROP TABLE IF EXISTS saved_posts;
      DROP TABLE IF EXISTS likes;
      DROP TABLE IF EXISTS follows;
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS conversations;
      DROP TABLE IF EXISTS story_highlights;
      DROP TABLE IF EXISTS stories;
      DROP TABLE IF EXISTS comments;
      DROP TABLE IF EXISTS media;
      DROP TABLE IF EXISTS posts;
      DROP TABLE IF EXISTS users;
    `);

    await this.createTables();
    await this.runMigrations();
  }
}

export default DatabaseService.getInstance();
