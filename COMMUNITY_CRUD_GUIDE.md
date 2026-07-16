# Community CRUD Operations Guide

## Overview

Complete CRUD (Create, Read, Update, Delete) operations for the Community page using Firebase Firestore, Realtime Database, and Storage.

## 📁 Files Structure

```
src/
├── services/
│   └── communityService.ts          # Core CRUD service
├── hooks/
│   └── useCommunity.ts              # Custom hooks for CRUD operations
└── pages/
    └── Community.tsx                 # Main component (updated with new ops)
```

## 🚀 Quick Start

### 1. Import Hooks in Your Component

```tsx
import {
  useCommunityPosts,
  useCommunityComments,
  useCommunityProfile,
  useCommunityEngagement,
  useCommunityNotifications,
} from '../hooks/useCommunity';
```

### 2. Use in Component

```tsx
const MyComponent = () => {
  const { createPost, deletePost, updatePost, loading, error } = useCommunityPosts();
  const { createComment, deleteComment } = useCommunityComments();
  const { saveProfile, getProfile } = useCommunityProfile();
  const { togglePostLike, sharePost } = useCommunityEngagement();
  const { createNotification, markAsRead } = useCommunityNotifications();

  // Your component logic here
};
```

## 📝 POST CRUD Operations

### Create Post

```tsx
const { createPost, loading, error } = useCommunityPosts();

const handleCreatePost = async () => {
  try {
    const post = await createPost({
      content: 'Hello Community!',
      authorId: user.uid,
      displayName: user.displayName,
      mediaFile: selectedFile, // Optional
    });
    console.log('Post created:', post);
  } catch (err) {
    console.error('Failed to create post:', err);
  }
};
```

**Response:**
```tsx
interface Post {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: number;
  likes: string[];
  comments: {};
  shares: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}
```

### Read Posts

```tsx
// Get all posts
const { getAllPosts, data: posts } = useCommunityPosts();
await getAllPosts(50); // 50 is the limit

// Get single post
const { getPost } = useCommunityPosts();
const post = await getPost('postId');

// Get user's posts
const { getPostsByUser } = useCommunityPosts();
const userPosts = await getPostsByUser('userId', 20);
```

### Update Post

```tsx
const { updatePost, loading } = useCommunityPosts();

await updatePost('postId', {
  content: 'Updated content',
  mediaFile: newFile, // Optional
});
```

### Delete Post

```tsx
const { deletePost, loading } = useCommunityPosts();

await deletePost('postId', 'authorId');
```

## 💬 COMMENT CRUD Operations

### Create Comment

```tsx
const { createComment } = useCommunityComments();

await createComment({
  content: 'Great post!',
  authorId: user.uid,
  displayName: user.displayName,
  postId: 'postId',
});
```

### Read Comments

```tsx
const { getPostComments } = useCommunityComments();

const comments = await getPostComments('postId');
```

### Update Comment

```tsx
const { updateComment } = useCommunityComments();

await updateComment('postId', 'commentId', 'Updated comment text');
```

### Delete Comment

```tsx
const { deleteComment } = useCommunityComments();

await deleteComment('postId', 'commentId');
```

## 👤 PROFILE CRUD Operations

### Create/Update Profile

```tsx
const { saveProfile } = useCommunityProfile();

await saveProfile(user.uid, {
  displayName: 'John Doe',
  bio: 'Software developer',
  description: 'Full description here',
  photoURL: 'https://...',
  status: 'Online',
  connections: [],
});
```

### Read Profile

```tsx
// Private profile (only user can see)
const { getProfile } = useCommunityProfile();
const profile = await getProfile(user.uid);

// Public profile (anyone can see limited data)
const { getPublicProfile } = useCommunityProfile();
const publicProfile = await getPublicProfile('userId');
```

### Add Connection (Follow)

```tsx
const { addConnection } = useCommunityProfile();

await addConnection(user.uid, 'userIdToFollow');
```

### Remove Connection (Unfollow)

```tsx
const { removeConnection } = useCommunityProfile();

await removeConnection(user.uid, 'userIdToUnfollow');
```

## ❤️ ENGAGEMENT Operations (Likes & Shares)

### Toggle Like on Post

```tsx
const { togglePostLike } = useCommunityEngagement();

const isNowLiked = await togglePostLike('postId', user.uid);
```

### Share Post

```tsx
const { sharePost } = useCommunityEngagement();

const newShareCount = await sharePost('postId');
```

### Toggle Like on Comment

```tsx
const { toggleCommentLike } = useCommunityEngagement();

const isNowLiked = await toggleCommentLike('postId', 'commentId', user.uid);
```

## 🔔 NOTIFICATION Operations

### Create Notification

```tsx
const { createNotification } = useCommunityNotifications();

await createNotification(recipientUserId, 'like', {
  postId: 'postId',
  fromUserId: user.uid,
  fromUserName: user.displayName,
  comment: 'Optional comment text',
});
```

### Mark as Read

```tsx
const { markAsRead } = useCommunityNotifications();

await markAsRead(user.uid, 'notificationId');
```

### Delete Notification

```tsx
const { deleteNotification } = useCommunityNotifications();

await deleteNotification(user.uid, 'notificationId');
```

## 📌 Best Practices

### 1. Error Handling

```tsx
const { error, loading } = useCommunityPosts();

if (error) {
  // Handle error
  setErrorMessage(error);
}

if (loading) {
  // Show loading spinner
  return <LoadingSpinner />;
}
```

### 2. Async/Await Pattern

```tsx
const handleAction = async () => {
  try {
    const result = await createPost(postData);
    console.log('Success:', result);
  } catch (err) {
    console.error('Error:', err);
    setError((err as Error).message);
  }
};
```

### 3. Validation Before Operations

```tsx
const handleCreatePost = async (content: string) => {
  if (!content.trim()) {
    setError('Post content is required');
    return;
  }

  if (!user) {
    setError('User not authenticated');
    return;
  }

  await createPost({
    content,
    authorId: user.uid,
    displayName: user.displayName,
  });
};
```

### 4. Handle Media Uploads

```tsx
const handleCreatePostWithMedia = async (file: File) => {
  // Validate file type
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    setError('Only images and videos are supported');
    return;
  }

  // Validate file size (max 50MB)
  if (file.size > 50 * 1024 * 1024) {
    setError('File size must be less than 50MB');
    return;
  }

  await createPost({
    content: 'Check this out!',
    authorId: user.uid,
    displayName: user.displayName,
    mediaFile: file,
  });
};
```

## 🔒 Security Considerations

### Firebase Rules (Firestore)

```
match /posts/{document=**} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.resource.data.authorId == request.auth.uid;
  allow update, delete: if request.auth != null && request.auth.uid == resource.data.authorId;
}

match /users/{uid} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow write: if request.auth != null && request.auth.uid == uid;
}

match /publicUsers/{uid} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == uid;
}
```

### Firebase Rules (Realtime Database)

```
{
  "posts": {
    "$postId": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('posts').child($postId).child('authorId').val() === auth.uid"
    }
  },
  "users": {
    "$uid": {
      ".read": "auth != null && auth.uid === $uid",
      ".write": "auth != null && auth.uid === $uid"
    }
  }
}
```

## 📊 Performance Tips

1. **Pagination**: Use `limit` parameter to load posts in batches
   ```tsx
   await getAllPosts(20); // Load 20 at a time
   ```

2. **Caching**: Store commonly accessed data in state/context
   ```tsx
   const [cachedProfile, setCachedProfile] = useState(null);
   ```

3. **Lazy Loading**: Load comments/detailed data on demand
   ```tsx
   const [expandedPostId, setExpandedPostId] = useState(null);
   // Only load comments if post is expanded
   ```

4. **Real-time Subscriptions**: Use RTDB for real-time updates instead of polling
   ```tsx
   // Already handled in Community.tsx with onSnapshot
   ```

## 🐛 Troubleshooting

### Post not appearing
- Check Firebase rules are allowing writes
- Verify `authorId` matches authenticated user
- Check browser console for errors

### Images not uploading
- Verify Firebase Storage rules allow uploads
- Check file size limits (50MB max)
- Ensure proper MIME type

### Slow performance
- Use pagination limits
- Reduce number of real-time listeners
- Implement caching

## 📚 Related Files

- [Community Component](../pages/Community.tsx)
- [Firebase Config](../pages/firebase.tsx)
- [Auth Context](../pages/AuthContext.tsx)
