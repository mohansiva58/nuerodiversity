/**
 * Community CRUD Service
 * Handles all Create, Read, Update, Delete operations for posts, comments, and profiles
 */

import {
  collection, addDoc, query as fsQuery, orderBy, limit, getDocs, where,
  deleteDoc, doc, updateDoc, serverTimestamp, getDoc, onSnapshot
} from 'firebase/firestore';
import { ref, onValue, update as rtdbUpdate, push, set as rtdbSet, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, rtdb, storage } from '../pages/firebase';

// ═══════════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

export interface Post {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: number;
  likes?: string[];
  comments: { [key: string]: Comment };
  shares: number;
  mediaUrl?: string;
  mediaPath?: string;
  mediaType?: 'image' | 'video';
}

export interface Comment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: number;
  likes: string[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  bio: string;
  description: string;
  photoURL?: string;
  status?: string;
  connections: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CreatePostInput {
  content: string;
  authorId: string;
  displayName: string;
  mediaFile?: File;
}

export interface UpdatePostInput {
  content?: string;
  mediaFile?: File;
}

export interface CreateCommentInput {
  content: string;
  authorId: string;
  displayName: string;
  postId: string;
}

export interface UpdateCommentInput {
  content: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST CRUD Operations
// ═══════════════════════════════════════════════════════════════════════════════

export const postService = {
  /**
   * CREATE: Add new post to Firestore and RTDB
   */
  async createPost(input: CreatePostInput): Promise<Post> {
    try {
      let mediaUrl = '';
      let mediaPath = '';
      let mediaType: 'image' | 'video' | undefined = undefined;

      // Upload media if provided
      if (input.mediaFile) {
        const file = input.mediaFile;
        mediaPath = `posts/${input.authorId}/${Date.now()}_${file.name}`;
        const fileRef = storageRef(storage, mediaPath);
        const snapshot = await uploadBytes(fileRef, file);
        mediaUrl = await getDownloadURL(snapshot.ref);
        mediaType = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : undefined;
      }

      const postData = {
        author: input.displayName,
        authorId: input.authorId,
        content: input.content.trim(),
        timestamp: serverTimestamp(),
        likes: [],
        comments: {},
        shares: 0,
        ...(mediaUrl && { mediaUrl, mediaPath, mediaType }),
      };

      // Save to Firestore
      const postsRef = collection(db, 'posts');
      const docRef = await addDoc(postsRef, postData);

      const newPost: Post = {
        id: docRef.id,
        ...postData,
        timestamp: Date.now(),
        likes: [],
        comments: {},
      } as Post;

      return newPost;
    } catch (error) {
      console.error('Error creating post:', error);
      throw new Error(`Failed to create post: ${(error as Error).message}`);
    }
  },

  /**
   * READ: Get single post
   */
  async getPost(postId: string): Promise<Post | null> {
    try {
      const postsRef = collection(db, 'posts');
      const postDoc = await getDoc(doc(postsRef, postId));
      
      if (!postDoc.exists()) return null;

      const data = postDoc.data() as any;
      return {
        id: postDoc.id,
        author: data.author || 'Unknown',
        authorId: data.authorId || '',
        content: data.content || '',
        timestamp: data.timestamp?.toMillis?.() || 0,
        likes: Array.isArray(data.likes) ? data.likes : [],
        comments: data.comments || {},
        shares: data.shares || 0,
        mediaUrl: data.mediaUrl || '',
        mediaPath: data.mediaPath || '',
        mediaType: data.mediaType || undefined,
      };
    } catch (error) {
      console.error('Error fetching post:', error);
      throw new Error(`Failed to fetch post: ${(error as Error).message}`);
    }
  },

  /**
   * READ: Get all posts with pagination
   */
  async getAllPosts(limitCount: number = 50): Promise<Post[]> {
    try {
      const postsRef = collection(db, 'posts');
      const postsQuery = fsQuery(postsRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(postsQuery);

      return querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() as any;
        return {
          id: docSnapshot.id,
          author: data.author || 'Unknown',
          authorId: data.authorId || '',
          content: data.content || '',
          timestamp: data.timestamp?.toMillis?.() || 0,
          likes: Array.isArray(data.likes) ? data.likes : [],
          comments: data.comments || {},
          shares: data.shares || 0,
          mediaUrl: data.mediaUrl || '',
          mediaPath: data.mediaPath || '',
          mediaType: data.mediaType || undefined,
        };
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw new Error(`Failed to fetch posts: ${(error as Error).message}`);
    }
  },

  /**
   * READ: Get posts by specific user
   */
  async getPostsByUser(userId: string, limitCount: number = 20): Promise<Post[]> {
    try {
      const postsRef = collection(db, 'posts');
      const postsQuery = fsQuery(
        postsRef,
        where('authorId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(postsQuery);

      return querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() as any;
        return {
          id: docSnapshot.id,
          author: data.author || 'Unknown',
          authorId: data.authorId || '',
          content: data.content || '',
          timestamp: data.timestamp?.toMillis?.() || 0,
          likes: Array.isArray(data.likes) ? data.likes : [],
          comments: data.comments || {},
          shares: data.shares || 0,
          mediaUrl: data.mediaUrl || '',
          mediaPath: data.mediaPath || '',
          mediaType: data.mediaType || undefined,
        };
      });
    } catch (error) {
      console.error('Error fetching user posts:', error);
      throw new Error(`Failed to fetch user posts: ${(error as Error).message}`);
    }
  },

  /**
   * UPDATE: Edit post content
   */
  async updatePost(postId: string, updates: UpdatePostInput): Promise<void> {
    try {
      let mediaUrl = '';
      let mediaPath = '';
      let mediaType: 'image' | 'video' | undefined = undefined;

      // Handle new media upload
      if (updates.mediaFile) {
        // Get existing post to delete old media
        const existingPost = await this.getPost(postId);
        if (existingPost?.mediaPath) {
          try {
            const oldFileRef = storageRef(storage, existingPost.mediaPath);
            await deleteObject(oldFileRef);
          } catch (err) {
            console.warn('Could not delete old media:', err);
          }
        }

        // Upload new media
        const file = updates.mediaFile;
        mediaPath = `posts/${Date.now()}_${file.name}`;
        const fileRef = storageRef(storage, mediaPath);
        const snapshot = await uploadBytes(fileRef, file);
        mediaUrl = await getDownloadURL(snapshot.ref);
        mediaType = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : undefined;
      }

      const updateData: any = {};
      if (updates.content !== undefined) updateData.content = updates.content;
      if (mediaUrl) {
        updateData.mediaUrl = mediaUrl;
        updateData.mediaPath = mediaPath;
        updateData.mediaType = mediaType;
      }

      if (Object.keys(updateData).length === 0) return;

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, updateData);
    } catch (error) {
      console.error('Error updating post:', error);
      throw new Error(`Failed to update post: ${(error as Error).message}`);
    }
  },

  /**
   * DELETE: Remove post and all associated data
   */
  async deletePost(postId: string, authorId: string): Promise<void> {
    try {
      // Get post to delete media
      const post = await this.getPost(postId);
      
      // Delete media using the stored path (not the download URL)
      if (post?.mediaPath) {
        try {
          const fileRef = storageRef(storage, post.mediaPath);
          await deleteObject(fileRef);
        } catch (err) {
          console.warn('Could not delete media file:', err);
          // Continue with deletion even if media can't be deleted
        }
      }

      // Delete from Firestore
      const postRef = doc(db, 'posts', postId);
      await deleteDoc(postRef);

      // Delete from RTDB if exists
      try {
        const rtdbPostRef = ref(rtdb, `posts/${postId}`);
        await remove(rtdbPostRef);
      } catch (err) {
        console.warn('Could not delete from RTDB:', err);
        // Continue - post is still deleted from Firestore which is primary
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      throw new Error(`Failed to delete post: ${(error as Error).message}`);
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENT CRUD Operations
// ═══════════════════════════════════════════════════════════════════════════════

export const commentService = {
  /**
   * CREATE: Add comment to post
   */
  async createComment(input: CreateCommentInput): Promise<Comment> {
    try {
      const commentData = {
        author: input.displayName,
        authorId: input.authorId,
        content: input.content.trim(),
        timestamp: serverTimestamp(),
        likes: [],
      };

      // Save to RTDB (real-time comments)
      const commentsRef = ref(rtdb, `posts/${input.postId}/comments`);
      const newCommentRef = push(commentsRef);
      await rtdbSet(newCommentRef, commentData);

      // Also save to Firestore
      const postRef = doc(db, 'posts', input.postId);
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        const currentComments = postDoc.data().comments || {};
        currentComments[newCommentRef.key || ''] = commentData;
        await updateDoc(postRef, { comments: currentComments });
      }

      return {
        id: newCommentRef.key || '',
        ...commentData,
        timestamp: Date.now(),
        likes: [],
      } as Comment;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw new Error(`Failed to create comment: ${(error as Error).message}`);
    }
  },

  /**
   * UPDATE: Edit comment content
   */
  async updateComment(postId: string, commentId: string, newContent: string): Promise<void> {
    try {
      const commentRef = ref(rtdb, `posts/${postId}/comments/${commentId}/content`);
      await rtdbSet(commentRef, newContent.trim());

      // Also update in Firestore
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        const currentComments = postDoc.data().comments || {};
        if (currentComments[commentId]) {
          currentComments[commentId].content = newContent.trim();
          await updateDoc(postRef, { comments: currentComments });
        }
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      throw new Error(`Failed to update comment: ${(error as Error).message}`);
    }
  },

  /**
   * DELETE: Remove comment
   */
  async deleteComment(postId: string, commentId: string): Promise<void> {
    try {
      const commentRef = ref(rtdb, `posts/${postId}/comments/${commentId}`);
      await remove(commentRef);

      // Also update in Firestore
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        const currentComments = postDoc.data().comments || {};
        delete currentComments[commentId];
        await updateDoc(postRef, { comments: currentComments });
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw new Error(`Failed to delete comment: ${(error as Error).message}`);
    }
  },

  /**
   * READ: Get all comments for a post
   */
  async getPostComments(postId: string): Promise<Comment[]> {
    try {
      const post = await postService.getPost(postId);
      if (!post) return [];

      return Object.entries(post.comments || {}).map(([id, comment]) => ({
        ...comment,
        id,
      })) as Comment[];
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new Error(`Failed to fetch comments: ${(error as Error).message}`);
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE CRUD Operations
// ═══════════════════════════════════════════════════════════════════════════════

export const profileService = {
  /**
   * CREATE/UPDATE: User profile (combines create and update)
   */
  async saveProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const privateUserRef = ref(rtdb, `users/${userId}`);
      const publicUserRef = ref(rtdb, `publicUsers/${userId}`);

      const timestamp = Date.now();
      const dataToSave = {
        ...profileData,
        uid: userId,
        updatedAt: timestamp,
      };

      // Update in RTDB (private and public)
      await rtdbUpdate(privateUserRef, dataToSave);
      
      // Save only public data to publicUsers
      const publicData = {
        displayName: profileData.displayName || 'Anonymous',
        photoURL: profileData.photoURL || '',
        bio: profileData.bio || '',
        uid: userId,
      };
      await rtdbUpdate(publicUserRef, publicData);

      return dataToSave as UserProfile;
    } catch (error) {
      console.error('Error saving profile:', error);
      throw new Error(`Failed to save profile: ${(error as Error).message}`);
    }
  },

  /**
   * READ: Get user profile
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      return new Promise((resolve, reject) => {
        const userRef = ref(rtdb, `users/${userId}`);
        onValue(
          userRef,
          (snapshot) => {
            const data = snapshot.val();
            if (data) {
              resolve({
                uid: userId,
                ...data,
              } as UserProfile);
            } else {
              resolve(null);
            }
          },
          (err) => reject(err),
          { onlyOnce: true }
        );
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw new Error(`Failed to fetch profile: ${(error as Error).message}`);
    }
  },

  /**
   * READ: Get public profile (limited data)
   */
  async getPublicProfile(userId: string): Promise<Partial<UserProfile> | null> {
    try {
      return new Promise((resolve, reject) => {
        const userRef = ref(rtdb, `publicUsers/${userId}`);
        onValue(
          userRef,
          (snapshot) => {
            const data = snapshot.val();
            resolve(data || null);
          },
          (err) => reject(err),
          { onlyOnce: true }
        );
      });
    } catch (error) {
      console.error('Error fetching public profile:', error);
      throw new Error(`Failed to fetch public profile: ${(error as Error).message}`);
    }
  },

  /**
   * DELETE: Remove user profile
   */
  async deleteProfile(userId: string): Promise<void> {
    try {
      const privateUserRef = ref(rtdb, `users/${userId}`);
      const publicUserRef = ref(rtdb, `publicUsers/${userId}`);
      
      await Promise.all([
        remove(privateUserRef),
        remove(publicUserRef),
      ]);
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw new Error(`Failed to delete profile: ${(error as Error).message}`);
    }
  },

  /**
   * UPDATE: Add connection (follow user)
   */
  async addConnection(userId: string, connectionId: string): Promise<void> {
    try {
      const userRef = ref(rtdb, `users/${userId}/connections`);
      const profile = await this.getProfile(userId);
      const currentConnections = profile?.connections || [];
      
      if (!currentConnections.includes(connectionId)) {
        currentConnections.push(connectionId);
        await rtdbUpdate(ref(rtdb, `users/${userId}`), {
          connections: currentConnections,
        });
      }
    } catch (error) {
      console.error('Error adding connection:', error);
      throw new Error(`Failed to add connection: ${(error as Error).message}`);
    }
  },

  /**
   * UPDATE: Remove connection (unfollow user)
   */
  async removeConnection(userId: string, connectionId: string): Promise<void> {
    try {
      const profile = await this.getProfile(userId);
      const currentConnections = profile?.connections || [];
      const updatedConnections = currentConnections.filter(id => id !== connectionId);
      
      await rtdbUpdate(ref(rtdb, `users/${userId}`), {
        connections: updatedConnections,
      });
    } catch (error) {
      console.error('Error removing connection:', error);
      throw new Error(`Failed to remove connection: ${(error as Error).message}`);
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIKE/SHARE Operations
// ═══════════════════════════════════════════════════════════════════════════════

export const engagementService = {
  /**
   * TOGGLE: Like/unlike post
   */
  async togglePostLike(postId: string, userId: string): Promise<boolean> {
    try {
      const post = await postService.getPost(postId);
      if (!post) throw new Error('Post not found');

      const currentLikes = post.likes || [];
      const isLiked = currentLikes.includes(userId);
      const updatedLikes = isLiked
        ? currentLikes.filter(id => id !== userId)
        : [...currentLikes, userId];

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, { likes: updatedLikes });

      return !isLiked;
    } catch (error) {
      console.error('Error toggling like:', error);
      throw new Error(`Failed to toggle like: ${(error as Error).message}`);
    }
  },

  /**
   * UPDATE: Increment share count
   */
  async sharePost(postId: string): Promise<number> {
    try {
      const post = await postService.getPost(postId);
      if (!post) throw new Error('Post not found');

      const newShareCount = (post.shares || 0) + 1;
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, { shares: newShareCount });

      return newShareCount;
    } catch (error) {
      console.error('Error sharing post:', error);
      throw new Error(`Failed to share post: ${(error as Error).message}`);
    }
  },

  /**
   * TOGGLE: Like/unlike comment
   */
  async toggleCommentLike(postId: string, commentId: string, userId: string): Promise<boolean> {
    try {
      const comments = await commentService.getPostComments(postId);
      const comment = comments.find(c => c.id === commentId);
      if (!comment) throw new Error('Comment not found');

      const currentLikes = comment.likes || [];
      const isLiked = currentLikes.includes(userId);
      const updatedLikes = isLiked
        ? currentLikes.filter(id => id !== userId)
        : [...currentLikes, userId];

      const commentRef = ref(rtdb, `posts/${postId}/comments/${commentId}/likes`);
      await rtdbSet(commentRef, updatedLikes);

      return !isLiked;
    } catch (error) {
      console.error('Error toggling comment like:', error);
      throw new Error(`Failed to toggle comment like: ${(error as Error).message}`);
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION Operations
// ═══════════════════════════════════════════════════════════════════════════════

export const notificationService = {
  /**
   * CREATE: Send notification
   */
  async createNotification(
    userId: string,
    type: 'like' | 'comment' | 'share' | 'connection',
    data: {
      postId?: string;
      fromUserId: string;
      fromUserName: string;
      comment?: string;
    }
  ): Promise<void> {
    try {
      const notificationRef = push(ref(rtdb, `notifications/${userId}`));
      await rtdbSet(notificationRef, {
        type,
        ...data,
        timestamp: serverTimestamp(),
        read: false,
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error(`Failed to create notification: ${(error as Error).message}`);
    }
  },

  /**
   * UPDATE: Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const notificationRef = ref(rtdb, `notifications/${userId}/${notificationId}/read`);
      await rtdbSet(notificationRef, true);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${(error as Error).message}`);
    }
  },

  /**
   * DELETE: Remove notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    try {
      const notificationRef = ref(rtdb, `notifications/${userId}/${notificationId}`);
      await remove(notificationRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error(`Failed to delete notification: ${(error as Error).message}`);
    }
  },
};
