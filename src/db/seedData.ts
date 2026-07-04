import DatabaseService from './database';
import { v4 as uuidv4 } from 'uuid';

export class SeedData {
  private db = DatabaseService;

  async seed(): Promise<void> {
    const database = await this.db.getDatabase();

    // Follow network:
    //   current-user → user-1, user-2, user-3, user-4   (followingCount = 4)
    //   user-1       → user-2, user-3, user-4, current   (followingCount = 4)
    //   user-2       → user-1, user-3, current            (followingCount = 3)
    //   user-3       → user-1, user-2, user-4             (followingCount = 3)
    //   user-4       → user-1, user-2, user-3, current    (followingCount = 4)
    //
    // followersCount (derived):
    //   current-user: user-1, user-4                      = 2
    //   user-1: current, user-2, user-3, user-4           = 4
    //   user-2: current, user-1, user-3, user-4           = 4
    //   user-3: current, user-1, user-2                   = 3
    //   user-4: current, user-1                           = 2

    const users = [
      {
        id: 'user-1',
        username: 'foodie_emma',
        email: 'emma@example.com',
        password: 'password123',
        displayName: 'Emma Rodriguez',
        bio: '👩‍🍳 Home chef | Recipe creator | Food lover',
        avatarUri: 'https://i.pravatar.cc/150?img=1',
        followersCount: 4,
        followingCount: 4,
        createdAt: new Date('2024-01-15').toISOString(),
      },
      {
        id: 'user-2',
        username: 'chef_marco',
        email: 'marco@example.com',
        password: 'password123',
        displayName: 'Marco Bianchi',
        bio: '🍝 Italian cuisine specialist | Sharing family recipes',
        avatarUri: 'https://i.pravatar.cc/150?img=12',
        followersCount: 4,
        followingCount: 3,
        createdAt: new Date('2023-11-20').toISOString(),
      },
      {
        id: 'user-3',
        username: 'healthy_sarah',
        email: 'sarah@example.com',
        password: 'password123',
        displayName: 'Sarah Williams',
        bio: '🥗 Nutritionist | Healthy eating advocate | Plant-based recipes',
        avatarUri: 'https://i.pravatar.cc/150?img=5',
        followersCount: 3,
        followingCount: 3,
        createdAt: new Date('2024-03-10').toISOString(),
      },
      {
        id: 'user-4',
        username: 'dessert_lover_anna',
        email: 'anna@example.com',
        password: 'password123',
        displayName: 'Anna Kim',
        bio: '🍰 Pastry chef | Sweet creations | Baking tutorials',
        avatarUri: 'https://i.pravatar.cc/150?img=9',
        followersCount: 2,
        followingCount: 4,
        createdAt: new Date('2023-09-05').toISOString(),
      },
      {
        id: 'current-user',
        username: 'you',
        email: 'you@example.com',
        password: 'password123',
        displayName: 'Your Name',
        bio: '🍳 Food enthusiast | Learning to cook',
        avatarUri: 'https://i.pravatar.cc/150?img=25',
        followersCount: 2,
        followingCount: 4,
        createdAt: new Date('2024-10-01').toISOString(),
      },
    ];

    for (const user of users) {
      await database.runAsync(
        `INSERT OR REPLACE INTO users (id, username, email, password, displayName, bio, avatarUri, followersCount, followingCount, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.id, user.username, user.email, user.password, user.displayName, user.bio, user.avatarUri, user.followersCount, user.followingCount, user.createdAt]
      );
    }

    const follows = [
      { followerId: 'current-user', followingId: 'user-1' },
      { followerId: 'current-user', followingId: 'user-2' },
      { followerId: 'current-user', followingId: 'user-3' },
      { followerId: 'current-user', followingId: 'user-4' },
      { followerId: 'user-1',       followingId: 'user-2' },
      { followerId: 'user-1',       followingId: 'user-3' },
      { followerId: 'user-1',       followingId: 'user-4' },
      { followerId: 'user-1',       followingId: 'current-user' },
      { followerId: 'user-2',       followingId: 'user-1' },
      { followerId: 'user-2',       followingId: 'user-3' },
      { followerId: 'user-2',       followingId: 'current-user' },
      { followerId: 'user-3',       followingId: 'user-1' },
      { followerId: 'user-3',       followingId: 'user-2' },
      { followerId: 'user-3',       followingId: 'user-4' },
      { followerId: 'user-4',       followingId: 'user-1' },
      { followerId: 'user-4',       followingId: 'user-2' },
      { followerId: 'user-4',       followingId: 'user-3' },
      { followerId: 'user-4',       followingId: 'current-user' },
    ];

    for (const follow of follows) {
      await database.runAsync(
        `INSERT OR REPLACE INTO follows (followerId, followingId, createdAt)
         VALUES (?, ?, ?)`,
        [follow.followerId, follow.followingId, new Date().toISOString()]
      );
    }

    // Likes per post (actual records must match likesCount):
    //   post-1: user-2, user-3, user-4, current-user  → 4
    //   post-2: user-1, user-3, user-4, current-user  → 4
    //   post-3: user-1, user-2, user-4, current-user  → 4
    //   post-4: user-1, user-2, user-3, current-user  → 4
    //   post-5: user-2, user-3, user-4                → 3
    //   post-6: user-1, user-2                        → 2
    //
    // Comments per post (actual records must match commentsCount):
    //   post-1: 4  post-2: 4  post-3: 3
    //   post-4: 4  post-5: 2  post-6: 2

    const posts = [
      {
        id: 'post-1',
        authorId: 'user-1',
        caption: '🍝 Homemade Carbonara! The secret is in the timing and using fresh eggs. This Roman classic never disappoints! #pasta #italianfood #carbonara',
        likesCount: 4,
        commentsCount: 4,
        createdAt: new Date('2024-11-03T10:30:00').toISOString(),
      },
      {
        id: 'post-2',
        authorId: 'user-2',
        caption: '🍕 Traditional Neapolitan Pizza from scratch! Made with love and a 72-hour fermented dough. Recipe coming soon! #pizza #foodporn #homemade',
        likesCount: 4,
        commentsCount: 4,
        createdAt: new Date('2024-11-02T15:20:00').toISOString(),
      },
      {
        id: 'post-3',
        authorId: 'user-3',
        caption: '🥗 Buddha Bowl packed with nutrients! Quinoa, roasted chickpeas, avocado, and tahini dressing. Perfect for meal prep! #healthyfood #vegan #buddhabowl',
        likesCount: 4,
        commentsCount: 3,
        createdAt: new Date('2024-11-01T09:15:00').toISOString(),
      },
      {
        id: 'post-4',
        authorId: 'user-4',
        caption: '🍰 Chocolate lava cake with a molten center! This dessert is always a crowd-pleaser. Swipe to see the flow! #dessert #chocolate #baking',
        likesCount: 4,
        commentsCount: 4,
        createdAt: new Date('2024-10-31T18:45:00').toISOString(),
      },
      {
        id: 'post-5',
        authorId: 'user-1',
        caption: '☕ Morning rituals: Fresh croissants and espresso. Sometimes simple is best! #breakfast #croissant #coffeetime',
        likesCount: 3,
        commentsCount: 2,
        createdAt: new Date('2024-10-30T08:00:00').toISOString(),
      },
      {
        id: 'post-6',
        authorId: 'user-3',
        caption: '🍜 Vegan Ramen with miso broth, tofu, and fresh vegetables. Comfort food that loves you back! #ramen #vegan #comfortfood',
        likesCount: 2,
        commentsCount: 2,
        createdAt: new Date('2024-10-29T19:30:00').toISOString(),
      },
    ];

    for (const post of posts) {
      await database.runAsync(
        `INSERT OR REPLACE INTO posts (id, authorId, caption, likesCount, commentsCount, createdAt, isArchived, uploadStatus)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'uploaded')`,
        [post.id, post.authorId, post.caption, post.likesCount, post.commentsCount, post.createdAt]
      );
    }

    const mediaItems = [
      { id: uuidv4(), postId: 'post-1', type: 'image', remoteUri: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800', order: 0 },
      { id: uuidv4(), postId: 'post-2', type: 'image', remoteUri: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800', order: 0 },
      { id: uuidv4(), postId: 'post-2', type: 'image', remoteUri: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800', order: 1 },
      { id: uuidv4(), postId: 'post-3', type: 'image', remoteUri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', order: 0 },
      { id: uuidv4(), postId: 'post-4', type: 'image', remoteUri: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800', order: 0 },
      { id: uuidv4(), postId: 'post-4', type: 'image', remoteUri: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800', order: 1 },
      { id: uuidv4(), postId: 'post-5', type: 'image', remoteUri: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800', order: 0 },
      { id: uuidv4(), postId: 'post-6', type: 'image', remoteUri: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800', order: 0 },
    ];

    for (const media of mediaItems) {
      await database.runAsync(
        `INSERT OR REPLACE INTO media (id, postId, storyId, messageId, type, remoteUri, localUri, thumbnailUri, \`order\`)
         VALUES (?, ?, NULL, NULL, ?, ?, NULL, NULL, ?)`,
        [media.id, media.postId, media.type, media.remoteUri, media.order]
      );
    }

    const comments = [
      // post-1: 4 comments
      { id: 'c-1-1', postId: 'post-1', authorId: 'user-2',       text: 'Looks delicious! 😍',               likesCount: 3, createdAt: new Date('2024-11-03T11:00:00').toISOString() },
      { id: 'c-1-2', postId: 'post-1', authorId: 'user-3',       text: 'Can you share the recipe?',          likesCount: 2, createdAt: new Date('2024-11-03T11:15:00').toISOString() },
      { id: 'c-1-3', postId: 'post-1', authorId: 'user-4',       text: 'Perfect timing on the egg! 🥚',     likesCount: 1, createdAt: new Date('2024-11-03T12:00:00').toISOString() },
      { id: 'c-1-4', postId: 'post-1', authorId: 'current-user', text: 'Making this tonight!',               likesCount: 0, createdAt: new Date('2024-11-03T13:00:00').toISOString() },
      // post-2: 4 comments
      { id: 'c-2-1', postId: 'post-2', authorId: 'user-1',       text: 'That crust looks perfect! 🍕',      likesCount: 5, createdAt: new Date('2024-11-02T16:00:00').toISOString() },
      { id: 'c-2-2', postId: 'post-2', authorId: 'user-3',       text: '72 hours is totally worth it!',     likesCount: 2, createdAt: new Date('2024-11-02T16:30:00').toISOString() },
      { id: 'c-2-3', postId: 'post-2', authorId: 'user-4',       text: 'My mouth is watering 😍',           likesCount: 3, createdAt: new Date('2024-11-02T17:00:00').toISOString() },
      { id: 'c-2-4', postId: 'post-2', authorId: 'current-user', text: "Can't wait to try this!",            likesCount: 1, createdAt: new Date('2024-11-02T18:00:00').toISOString() },
      // post-3: 3 comments
      { id: 'c-3-1', postId: 'post-3', authorId: 'user-1',       text: 'So healthy and delicious!',         likesCount: 2, createdAt: new Date('2024-11-01T10:00:00').toISOString() },
      { id: 'c-3-2', postId: 'post-3', authorId: 'user-2',       text: 'Great for meal prep!',               likesCount: 1, createdAt: new Date('2024-11-01T10:30:00').toISOString() },
      { id: 'c-3-3', postId: 'post-3', authorId: 'current-user', text: 'Made this today, so good!',         likesCount: 1, createdAt: new Date('2024-11-01T12:00:00').toISOString() },
      // post-4: 4 comments
      { id: 'c-4-1', postId: 'post-4', authorId: 'user-1',       text: 'I need this right now! 🍫',         likesCount: 4, createdAt: new Date('2024-10-31T19:00:00').toISOString() },
      { id: 'c-4-2', postId: 'post-4', authorId: 'user-2',       text: 'The molten center is perfect!',     likesCount: 2, createdAt: new Date('2024-10-31T19:15:00').toISOString() },
      { id: 'c-4-3', postId: 'post-4', authorId: 'user-3',       text: 'Best dessert ever! 🍫',             likesCount: 3, createdAt: new Date('2024-10-31T20:00:00').toISOString() },
      { id: 'c-4-4', postId: 'post-4', authorId: 'current-user', text: 'This looks incredible!',            likesCount: 1, createdAt: new Date('2024-10-31T21:00:00').toISOString() },
      // post-5: 2 comments
      { id: 'c-5-1', postId: 'post-5', authorId: 'user-3',       text: 'Perfect morning vibes ☕',          likesCount: 1, createdAt: new Date('2024-10-30T09:00:00').toISOString() },
      { id: 'c-5-2', postId: 'post-5', authorId: 'user-4',       text: 'Those croissants look so flaky!',   likesCount: 2, createdAt: new Date('2024-10-30T09:30:00').toISOString() },
      // post-6: 2 comments
      { id: 'c-6-1', postId: 'post-6', authorId: 'user-1',       text: 'Love the miso broth! 🍜',           likesCount: 1, createdAt: new Date('2024-10-29T20:00:00').toISOString() },
      { id: 'c-6-2', postId: 'post-6', authorId: 'user-2',       text: 'This looks so comforting!',         likesCount: 1, createdAt: new Date('2024-10-29T20:30:00').toISOString() },
    ];

    for (const comment of comments) {
      await database.runAsync(
        `INSERT OR REPLACE INTO comments (id, postId, storyId, authorId, text, likesCount, createdAt, replyToCommentId)
         VALUES (?, ?, NULL, ?, ?, ?, ?, NULL)`,
        [comment.id, comment.postId, comment.authorId, comment.text, comment.likesCount, comment.createdAt]
      );
    }

    const likes = [
      // post-1: user-2, user-3, user-4, current-user
      { userId: 'user-2',       postId: 'post-1' },
      { userId: 'user-3',       postId: 'post-1' },
      { userId: 'user-4',       postId: 'post-1' },
      { userId: 'current-user', postId: 'post-1' },
      // post-2: user-1, user-3, user-4, current-user
      { userId: 'user-1',       postId: 'post-2' },
      { userId: 'user-3',       postId: 'post-2' },
      { userId: 'user-4',       postId: 'post-2' },
      { userId: 'current-user', postId: 'post-2' },
      // post-3: user-1, user-2, user-4, current-user
      { userId: 'user-1',       postId: 'post-3' },
      { userId: 'user-2',       postId: 'post-3' },
      { userId: 'user-4',       postId: 'post-3' },
      { userId: 'current-user', postId: 'post-3' },
      // post-4: user-1, user-2, user-3, current-user
      { userId: 'user-1',       postId: 'post-4' },
      { userId: 'user-2',       postId: 'post-4' },
      { userId: 'user-3',       postId: 'post-4' },
      { userId: 'current-user', postId: 'post-4' },
      // post-5: user-2, user-3, user-4
      { userId: 'user-2',       postId: 'post-5' },
      { userId: 'user-3',       postId: 'post-5' },
      { userId: 'user-4',       postId: 'post-5' },
      // post-6: user-1, user-2
      { userId: 'user-1',       postId: 'post-6' },
      { userId: 'user-2',       postId: 'post-6' },
    ];

    for (const like of likes) {
      await database.runAsync(
        `INSERT OR REPLACE INTO likes (userId, postId, commentId, createdAt)
         VALUES (?, ?, '', ?)`,
        [like.userId, like.postId, new Date().toISOString()]
      );
    }

    await database.runAsync(
      `INSERT OR REPLACE INTO saved_posts (userId, postId, createdAt)
       VALUES (?, ?, ?)`,
      ['current-user', 'post-2', new Date().toISOString()]
    );

    const stories = [
      { id: 'story-1', authorId: 'user-1', mediaId: uuidv4(), createdAt: new Date(Date.now() - 3600000).toISOString(), views: 4 },
      { id: 'story-2', authorId: 'user-2', mediaId: uuidv4(), createdAt: new Date(Date.now() - 7200000).toISOString(), views: 3 },
      { id: 'story-3', authorId: 'user-4', mediaId: uuidv4(), createdAt: new Date(Date.now() - 1800000).toISOString(), views: 2 },
    ];

    for (const story of stories) {
      const expiresAt = new Date(new Date(story.createdAt).getTime() + 24 * 3600000).toISOString();
      await database.runAsync(
        `INSERT OR REPLACE INTO stories (id, authorId, mediaId, createdAt, expiresAt, views, repliesCount, isHighlighted, uploadStatus)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'uploaded')`,
        [story.id, story.authorId, story.mediaId, story.createdAt, expiresAt, story.views]
      );
      await database.runAsync(
        `INSERT OR REPLACE INTO media (id, postId, storyId, messageId, type, remoteUri, \`order\`)
         VALUES (?, NULL, ?, NULL, 'image', ?, 0)`,
        [story.mediaId, story.id, `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800`]
      );
    }

    const conversations = [
      { id: 'conv-1', participantIds: 'current-user,user-1', unreadCount: 2, updatedAt: new Date().toISOString() },
      { id: 'conv-2', participantIds: 'current-user,user-2', unreadCount: 0, updatedAt: new Date(Date.now() - 3600000).toISOString() },
    ];

    for (const conv of conversations) {
      await database.runAsync(
        `INSERT OR REPLACE INTO conversations (id, participantIds, unreadCount, updatedAt, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        [conv.id, conv.participantIds, conv.unreadCount, conv.updatedAt, new Date('2024-10-20').toISOString()]
      );
    }

    const messages = [
      { id: uuidv4(), conversationId: 'conv-1', senderId: 'user-1',       text: 'Hey! Loved your latest recipe post!', status: 'read',      createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: uuidv4(), conversationId: 'conv-1', senderId: 'current-user', text: 'Thanks so much! 😊',                  status: 'read',      createdAt: new Date(Date.now() - 7000000).toISOString() },
      { id: uuidv4(), conversationId: 'conv-1', senderId: 'user-1',       text: 'Can you share the measurements?',      status: 'delivered', createdAt: new Date(Date.now() - 1800000).toISOString() },
      { id: uuidv4(), conversationId: 'conv-2', senderId: 'current-user', text: 'Your pizza dough recipe is amazing!',  status: 'read',      createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: uuidv4(), conversationId: 'conv-2', senderId: 'user-2',       text: 'Thank you! Glad you liked it 🍕',      status: 'read',      createdAt: new Date(Date.now() - 82800000).toISOString() },
    ];

    for (const message of messages) {
      await database.runAsync(
        `INSERT OR REPLACE INTO messages (id, conversationId, senderId, text, status, createdAt, replyToMessageId)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
        [message.id, message.conversationId, message.senderId, message.text, message.status, message.createdAt]
      );
    }

    // Notifications for current-user
    // Actors: user-1 followed current-user, user-4 followed current-user
    // post-5 (authorId: current-user) liked by user-2, user-3, user-4
    // post-6 (authorId: current-user) liked by user-1, user-2
    // comments on current-user's posts
    const notifications = [
      { id: 'notif-1', recipientId: 'current-user', actorId: 'user-4', type: 'follow',   postId: null, commentId: null, message: 'started following you',   isRead: 0, createdAt: new Date(Date.now() - 600000).toISOString() },
      { id: 'notif-2', recipientId: 'current-user', actorId: 'user-1', type: 'follow',   postId: null, commentId: null, message: 'started following you',   isRead: 0, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'notif-3', recipientId: 'current-user', actorId: 'user-2', type: 'like',     postId: 'post-5', commentId: null, message: 'liked your post',     isRead: 0, createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'notif-4', recipientId: 'current-user', actorId: 'user-3', type: 'like',     postId: 'post-5', commentId: null, message: 'liked your post',     isRead: 1, createdAt: new Date(Date.now() - 14400000).toISOString() },
      { id: 'notif-5', recipientId: 'current-user', actorId: 'user-4', type: 'like',     postId: 'post-5', commentId: null, message: 'liked your post',     isRead: 1, createdAt: new Date(Date.now() - 21600000).toISOString() },
      { id: 'notif-6', recipientId: 'current-user', actorId: 'user-1', type: 'like',     postId: 'post-6', commentId: null, message: 'liked your post',     isRead: 1, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'notif-7', recipientId: 'current-user', actorId: 'user-2', type: 'like',     postId: 'post-6', commentId: null, message: 'liked your post',     isRead: 1, createdAt: new Date(Date.now() - 90000000).toISOString() },
      { id: 'notif-8', recipientId: 'current-user', actorId: 'user-3', type: 'comment',  postId: 'post-5', commentId: 'c-5-1', message: 'commented on your post', isRead: 1, createdAt: new Date(Date.now() - 108000000).toISOString() },
      { id: 'notif-9', recipientId: 'current-user', actorId: 'user-1', type: 'comment',  postId: 'post-6', commentId: 'c-6-1', message: 'commented on your post', isRead: 1, createdAt: new Date(Date.now() - 172800000).toISOString() },
    ];

    for (const n of notifications) {
      await database.runAsync(
        `INSERT OR REPLACE INTO notifications (id, recipientId, actorId, type, postId, commentId, message, isRead, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.id, n.recipientId, n.actorId, n.type, n.postId, n.commentId, n.message, n.isRead, n.createdAt]
      );
    }

    console.log('✅ Database seeded successfully!');
  }

  async clearAndSeed(): Promise<void> {
    await this.db.clearDatabase();
    await this.seed();
  }
}

export default new SeedData();
