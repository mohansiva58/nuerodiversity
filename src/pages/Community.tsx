/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Smile, Search, Bell, User, MessageSquare, Users, Save,
  ArrowLeft, LogOut, Upload, Home, PlusCircle, Heart, Share2,
  MoreHorizontal, Bookmark, ThumbsUp, MessageCircle, Globe,
  Hash, AtSign, Link, Image as ImageIcon, Video, FileText, X, Edit2, Trash2
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../pages/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  collection, addDoc, query as fsQuery, orderBy, limit, onSnapshot,
  updateDoc, doc, serverTimestamp, getDocs, where
} from 'firebase/firestore';
import {
  ref, onValue, update as rtdbUpdate, push, set as rtdbSet
} from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, rtdb, storage } from './firebase'; // Import from firebase.ts
import { signOut } from 'firebase/auth'; 
import { useTranslation } from 'react-i18next';
import { useCommunityPosts, useCommunityComments } from '../hooks/useCommunity';

// Custom CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
  .glassmorphism {
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    background-color: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(209, 213, 219, 0.3);
  }
  .text-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .card-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .card-hover:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
`;
document.head.appendChild(style);

interface Post {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: number;
  likes?: string[];
  comments: { [key: string]: Comment };
  shares: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

interface Comment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: number;
  likes: string[];
}

interface UserProfile {
  bio: string;
  description: string;
  connections: string[];
  displayName: string;
  lastActive: number;
  isLoggedIn: boolean;
  photoURL?: string;
  status?: string;
}

interface OtherUser {
  uid: string;
  displayName: string;
  bio: string;
  lastActive: number;
  isLoggedIn: boolean;
  photoURL?: string;
}

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'share';
  postId: string;
  fromUserId: string;
  fromUserName: string;
  timestamp: number;
  read: boolean;
  comment?: string;
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};



const SocialPlatform = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);

  const getTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval}${t('community.time.y')}`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval}${t('community.time.mo')}`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval}${t('community.time.d')}`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}${t('community.time.h')}`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}${t('community.time.m')}`;
    return `${Math.floor(seconds)}${t('community.time.s')}`;
  };
  const [newPostContent, setNewPostContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'feed' | 'messages' | 'notifications' | 'profile' | 'create'>('feed');
  const [profileData, setProfileData] = useState<UserProfile>({
    bio: '',
    description: '',
    connections: [],
    displayName: '',
    lastActive: 0,
    isLoggedIn: false,
    photoURL: '',
    status: '',
  });
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState('');
  const [postMedia, setPostMedia] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // CRUD Operations State
  const { deletePost, updatePost } = useCommunityPosts();
  const { deleteComment, updateComment } = useCommunityComments();
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState<string>('');
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const postsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Update user status in both /users and /publicUsers
    const updateUserStatus = async () => {
      const privateUserRef = ref(rtdb, `users/${user.uid}`);
      const publicUserRef = ref(rtdb, `publicUsers/${user.uid}`);
      const timestamp = serverTimestamp();
      const privateData = {
        lastActive: timestamp,
        isLoggedIn: true,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || '',
      };
      const publicData = {
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || '',
        lastActive: timestamp,
        isLoggedIn: true,
      };

      try {
        await rtdbUpdate(privateUserRef, privateData);
        await rtdbUpdate(publicUserRef, publicData);
      } catch (err) {
        console.error('Error updating user status:', err);
        setError('Failed to update user status');
      }
    };
    updateUserStatus();

    // Load private user profile from /users
    const privateUserRef = ref(rtdb, `users/${user.uid}`);
    const unsubscribeProfile = onValue(privateUserRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfileData({
          bio: data.bio || '',
          description: data.description || '',
          connections: data.connections || [],
          displayName: data.displayName || 'Anonymous',
          lastActive: data.lastActive || 0,
          isLoggedIn: data.isLoggedIn || false,
          photoURL: data.photoURL || '',
          status: data.status || '',
        });
      }
    }, (err) => {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    });

    // Load posts from localStorage first (fallback)
    const storedPosts = getPosts();
    setPosts(storedPosts);

    // Load posts from Firestore
    const postsRef = collection(db, 'posts');
    const postsQuery = fsQuery(postsRef, orderBy('timestamp', 'desc'), limit(50));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts: Post[] = snapshot.docs.map((docSnapshot) => {
        const post = docSnapshot.data() as any;
        return {
          id: docSnapshot.id,
          author: post.author || 'Unknown',
          authorId: post.authorId || '',
          content: post.content || '',
          timestamp: post.timestamp?.toMillis?.() || 0,
          likes: Array.isArray(post.likes) ? post.likes : [], // Ensure likes is always an array
          comments: post.comments || {},
          shares: post.shares || 0,
          mediaUrl: post.mediaUrl || '',
          mediaType: post.mediaType || undefined,
        };
      });
      
      // Merge Firestore results with localStorage posts
      // Keep any localStorage posts that don't exist in Firestore
      if (fetchedPosts.length > 0) {
        // Get current posts from state to find any local-only posts
        setPosts((currentPosts) => {
          const localOnlyPosts = currentPosts.filter(
            (localPost) => !fetchedPosts.some((fbPost) => fbPost.id === localPost.id)
          );
          // Combine Firestore posts with local-only posts, sorted by timestamp
          const combined = [...fetchedPosts, ...localOnlyPosts].sort(
            (a, b) => b.timestamp - a.timestamp
          );
          return combined;
        });
      }
    }, (err) => {
      console.error('Error fetching posts from Firestore, using localStorage:', err);
      // Keep using localStorage posts on error
    });

    // Load other users from /publicUsers
    const publicUsersRef = ref(rtdb, 'publicUsers');
    const unsubscribePublicUsers = onValue(publicUsersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList: OtherUser[] = Object.entries(data)
          .filter(([uid]) => uid !== user.uid)
          .map(([uid, userData]: [string, any]) => ({
            uid,
            displayName: userData.displayName || 'Anonymous',
            bio: userData.bio || 'No bio available',
            lastActive: userData.lastActive || 0,
            isLoggedIn: userData.isLoggedIn || false,
            photoURL: userData.photoURL || '',
          }));
        setOtherUsers(usersList);
      } else {
        setOtherUsers([]);
      }
    }, (err) => {
      console.error('Error fetching public users:', err);
      setError('Failed to load users');
    });

    // Load notifications
    const notificationsRef = ref(rtdb, `notifications/${user.uid}`);
    const unsubscribeNotifications = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notificationList: Notification[] = Object.entries(data).map(([id, notif]: [string, any]) => ({
          id,
          type: notif.type || 'unknown',
          postId: notif.postId || '',
          fromUserId: notif.fromUserId || '',
          fromUserName: notif.fromUserName || 'Unknown',
          timestamp: notif.timestamp || 0,
          read: notif.read || false,
          comment: notif.comment || undefined,
        }));
        setNotifications(notificationList);
      } else {
        setNotifications([]);
      }
    }, (err) => {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    });

    // Cleanup on unmount
    return () => {
      unsubscribeProfile();
      unsubscribePosts();
      unsubscribePublicUsers();
      unsubscribeNotifications();
      if (user) {
        const cleanupPrivateRef = ref(rtdb, `users/${user.uid}`);
        const cleanupPublicRef = ref(rtdb, `publicUsers/${user.uid}`);
        Promise.all([
          rtdbUpdate(cleanupPrivateRef, { isLoggedIn: false, lastActive: serverTimestamp() }),
          rtdbUpdate(cleanupPublicRef, { isLoggedIn: false, lastActive: serverTimestamp() }),
        ]).catch((err) => console.error('Error on cleanup:', err));
      }
    };
  }, [user]);

  const uploadMedia = async (file: File): Promise<string> => {
    const fileRef = storageRef(storage, `posts/${user?.uid}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(fileRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.error('Error uploading media:', err);
      throw new Error('Failed to upload media');
    }
  };

  // Local storage fallback for posts
  const getPosts = (): Post[] => {
    try {
      const stored = localStorage.getItem('community_posts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const savePosts = (posts: Post[]) => {
    try {
      localStorage.setItem('community_posts', JSON.stringify(posts));
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !postMedia) {
      setError('Post content or media is required');
      return;
    }
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      let mediaUrl = '';
      let mediaType: 'image' | 'video' | undefined = undefined;

      if (postMedia) {
        mediaUrl = await uploadMedia(postMedia);
        mediaType = postMedia.type.startsWith('image') ? 'image' : postMedia.type.startsWith('video') ? 'video' : undefined;
      }

      const newPost: Post = {
        id: Date.now().toString(),
        author: profileData.displayName || user.displayName || 'Anonymous',
        authorId: user.uid,
        content: newPostContent.trim(),
        timestamp: Date.now(),
        likes: [],
        comments: {},
        shares: 0,
        ...(mediaUrl && { mediaUrl, mediaType }),
      };

      // Use localStorage fallback - immediately save
      const allPosts = getPosts();
      allPosts.unshift(newPost);
      savePosts(allPosts);
      setPosts(allPosts);

      // Clear form immediately
      setNewPostContent('');
      setPostMedia(null);
      setPreviewUrl(null);
      setError(null);

      // Also try Firebase (fire and forget)
      try {
        const postsRef = collection(db, 'posts');
        await addDoc(postsRef, { ...newPost, timestamp: serverTimestamp() });
      } catch (fbErr) {
        console.error('Firebase save failed, using localStorage:', fbErr);
      }

      // Small delay to ensure state updates complete before switching tabs
      setTimeout(() => {
        setCurrentTab('feed');
      }, 100);
    } catch (err) {
      console.error('Error creating post:', err);
      setError((err as Error).message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;

    try {
      const postRef = ref(rtdb, `posts/${postId}`);
      const snapshot = await new Promise<any>((resolve) => {
        onValue(postRef, (snap) => resolve(snap.val()), { onlyOnce: true });
      });

      if (snapshot) {
        const post = snapshot;
        const currentLikes = Array.isArray(post.likes) ? post.likes : [];
        const updatedLikes = currentLikes.includes(user.uid)
          ? currentLikes.filter((id: string) => id !== user.uid)
          : [...currentLikes, user.uid];

        await rtdbUpdate(postRef, { likes: updatedLikes });

        if (post.authorId !== user.uid && !currentLikes.includes(user.uid)) {
          const notificationRef = push(ref(rtdb, `notifications/${post.authorId}`));
          await rtdbSet(notificationRef, {
            type: 'like',
            postId,
            fromUserId: user.uid,
            fromUserName: profileData.displayName || user.displayName || 'Anonymous',
            timestamp: serverTimestamp(),
            read: false,
          });
        }
      }
    } catch (err) {
      console.error('Error liking post:', err);
      setError((err as Error).message || 'Failed to like post');
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim() || !user || !selectedPost) return;

    try {
      const commentData = {
        author: profileData.displayName || user.displayName || 'Anonymous',
        authorId: user.uid,
        content: newComment.trim(),
        timestamp: serverTimestamp(),
        likes: [],
      };

      const commentsRef = ref(rtdb, `posts/${postId}/comments`);
      const newCommentRef = push(commentsRef);
      await rtdbSet(newCommentRef, commentData);

      if (selectedPost.authorId !== user.uid) {
        const notificationRef = push(ref(rtdb, `notifications/${selectedPost.authorId}`));
        await rtdbSet(notificationRef, {
          type: 'comment',
          postId,
          fromUserId: user.uid,
          fromUserName: profileData.displayName || user.displayName || 'Anonymous',
          timestamp: serverTimestamp(),
          read: false,
          comment: newComment.substring(0, 50),
        });
      }

      setNewComment('');
      setError(null);
    } catch (err) {
      console.error('Error adding comment:', err);
      setError((err as Error).message || 'Failed to add comment');
    }
  };

  const handleSharePost = async (postId: string) => {
    if (!user) return;

    try {
      const postRef = ref(rtdb, `posts/${postId}`);
      const snapshot = await new Promise<any>((resolve) => {
        onValue(postRef, (snap) => resolve(snap.val()), { onlyOnce: true });
      });

      if (snapshot) {
        const post = snapshot;
        await rtdbUpdate(postRef, { shares: (post.shares || 0) + 1 });

        if (post.authorId !== user.uid) {
          const notificationRef = push(ref(rtdb, `notifications/${post.authorId}`));
          await rtdbSet(notificationRef, {
            type: 'share',
            postId,
            fromUserId: user.uid,
            fromUserName: profileData.displayName || user.displayName || 'Anonymous',
            timestamp: serverTimestamp(),
            read: false,
          });
        }
      }
    } catch (err) {
      console.error('Error sharing post:', err);
      setError((err as Error).message || 'Failed to share post');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPostMedia(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveMedia = () => {
    setPostMedia(null);
    setPreviewUrl(null);
  };

  const handleLogout = async () => {
    try {
      if (user) {
        const privateUserRef = ref(rtdb, `users/${user.uid}`);
        const publicUserRef = ref(rtdb, `publicUsers/${user.uid}`);
        await Promise.all([
          rtdbUpdate(privateUserRef, { isLoggedIn: false, lastActive: serverTimestamp() }),
          rtdbUpdate(publicUserRef, { isLoggedIn: false, lastActive: serverTimestamp() }),
        ]);
      }
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err);
      setError((err as Error).message || 'Failed to log out');
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      await rtdbUpdate(ref(rtdb, `notifications/${user.uid}/${notificationId}`), {
        read: true,
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError((err as Error).message || 'Failed to update notification');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // CRUD Operations Handlers
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleDeletePost = async (postId: string, authorId: string) => {
    if (user?.uid !== authorId) {
      setError('You can only delete your own posts');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      setLoading(true);
      await deletePost(postId, authorId);
      // Remove from UI
      setPosts(posts.filter(p => p.id !== postId));
      setOpenMenuPostId(null);
      setError(null);
    } catch (err) {
      console.error('Error deleting post:', err);
      setError((err as Error).message || 'Failed to delete post');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPost = async (postId: string) => {
    if (!editingContent.trim()) {
      setError('Post content cannot be empty');
      return;
    }

    try {
      setLoading(true);
      await updatePost(postId, { content: editingContent });
      
      // Update in UI
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, content: editingContent } : p
      ));
      
      setEditingPostId(null);
      setEditingContent('');
      setOpenMenuPostId(null);
      setError(null);
    } catch (err) {
      console.error('Error updating post:', err);
      setError((err as Error).message || 'Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string, commentAuthorId: string) => {
    if (user?.uid !== commentAuthorId && user?.uid !== posts.find(p => p.id === postId)?.authorId) {
      setError('You can only delete your own comments');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      setLoading(true);
      await deleteComment(postId, commentId);
      
      // Update in UI
      setPosts(posts.map(p => {
        if (p.id === postId) {
          const newComments = { ...p.comments };
          delete newComments[commentId];
          return { ...p, comments: newComments };
        }
        return p;
      }));
      
      setOpenCommentMenuId(null);
      setError(null);
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError((err as Error).message || 'Failed to delete comment');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = async (postId: string, commentId: string) => {
    if (!editingCommentContent.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      setLoading(true);
      await updateComment(postId, commentId, editingCommentContent);
      
      // Update in UI
      setPosts(posts.map(p => 
        p.id === postId 
          ? {
              ...p,
              comments: {
                ...p.comments,
                [commentId]: { ...p.comments[commentId], content: editingCommentContent }
              }
            }
          : p
      ));
      
      setEditingCommentId(null);
      setEditingCommentContent('');
      setOpenCommentMenuId(null);
      setError(null);
    } catch (err) {
      console.error('Error updating comment:', err);
      setError((err as Error).message || 'Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-lg text-gray-900">{t('community.errors.login')}</p>
        <button
          onClick={() => navigate('/login')}
          className="ml-4 p-2 bg-blue-100 text-blue-700 rounded-full border-2 border-blue-300"
        >
          {t('community.errors.loginBtn')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 font-sans pt-9">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-gradient-to-br from-yellow-200 to-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-200 to-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Top Header - Desktop */}
      {!isMobile && (
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="h-16 bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 flex items-center justify-between px-6 relative z-10"
        >
          <div className="flex items-center space-x-4">
            <motion.h1
              whileHover={{ scale: 1.05 }}
              className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              {t('community.header.title')}
            </motion.h1>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('community.header.searchPlaceholder')}
                className="pl-10 pr-4 py-2 bg-white/70 backdrop-blur-sm border border-white/30 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white w-72 transition-all duration-300"
              />
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <motion.button
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentTab('feed')}
              className={`flex flex-col items-center p-3 rounded-xl transition-all duration-300 ${currentTab === 'feed'
                ? 'text-blue-600 bg-blue-50 shadow-md'
                : 'text-gray-600 hover:text-blue-500 hover:bg-blue-50/50'
                }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">{t('community.header.home')}</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentTab('notifications')}
              className={`flex flex-col items-center p-3 rounded-xl transition-all duration-300 relative ${currentTab === 'notifications'
                ? 'text-purple-600 bg-purple-50 shadow-md'
                : 'text-gray-600 hover:text-purple-500 hover:bg-purple-50/50'
                }`}
            >
              <Bell className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">{t('community.header.notifications')}</span>
              {notifications.filter(n => !n.read).length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center shadow-lg font-bold"
                >
                  {notifications.filter(n => !n.read).length}
                </motion.span>
              )}
            </motion.button>
          </nav>

          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentTab('create')}
              className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-purple-200 text-gray-700 px-6 py-2 rounded-full hover:from-blue-200 hover:to-purple-300 transition-all duration-300 shadow-lg font-medium border-2 border-blue-300"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('community.header.create')}</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setCurrentTab('profile')}
              className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full pr-4 pl-2 py-2 border border-white/30 hover:bg-white/90 transition-all duration-300 shadow-md"
            >
              {profileData.photoURL ? (
                <img
                  src={profileData.photoURL}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-200"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              {!isMobile && <span className="text-sm font-medium text-gray-700">{profileData.displayName}</span>}
            </motion.button>
          </div>
        </motion.header>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="h-16 bg-white/90 backdrop-blur-md shadow-lg border-b border-white/20 flex items-center justify-between px-4 relative z-10"
        >
          <div className="flex items-center">
            <motion.h1
              whileHover={{ scale: 1.05 }}
              className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              {t('community.header.title')}
            </motion.h1>
          </div>
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full bg-gray-100/70 backdrop-blur-sm"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentTab('notifications')}
              className="relative p-2 rounded-full bg-gray-100/70 backdrop-blur-sm"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.filter(n => !n.read).length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                >
                  {notifications.filter(n => !n.read).length}
                </motion.span>
              )}
            </motion.button>
          </div>
        </motion.header>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto p-4"
            >
              <div className="bg-gradient-to-r from-red-100 to-pink-100 border border-red-200 text-red-700 p-4 rounded-xl shadow-lg backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentTab === 'feed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`${isMobile ? 'max-w-2xl' : 'max-w-7xl grid grid-cols-2 gap-6'} mx-auto p-4`}
          >
            {!isMobile && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="sticky top-6 h-fit"
              >
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                  <img
                    src="/neurodiversity-community.svg"
                    alt="Neurodiversity community"
                    className="w-full h-[520px] object-cover"
                  />
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-white/30">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Celebrate different ways of thinking. Share stories, ask questions, and support each other.
                    </p>
                  </div>
                </div>
              </motion.aside>
            )}

            <div className="space-y-6">
            {/* Enhanced Post Creation Card */}
            <motion.div
              whileHover={{ scale: 1.01, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
              className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-1">
                <div className="bg-white rounded-2xl p-4">
                  <div className="flex items-start space-x-3">
                    {profileData.photoURL ? (
                      <motion.img
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        src={profileData.photoURL}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover ring-3 ring-blue-200 shadow-md"
                      />
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center shadow-md"
                      >
                        <User className="w-6 h-6 text-white" />
                      </motion.div>
                    )}
                    <div className="flex-1">
                      <motion.textarea
                        whileFocus={{ scale: 1.02 }}
                        placeholder={t('community.createPost.placeholder')}
                        className="w-full p-3 border-2 border-gray-100 focus:border-purple-300 rounded-xl resize-none transition-all duration-300 bg-gray-50/50 focus:bg-white focus:shadow-lg"
                        rows={3}
                        onClick={() => setCurrentTab('create')}
                      />
                      <div className="flex justify-between items-center pt-3">
                        <div className="flex space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 text-gray-500 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all duration-300"
                          >
                            <ImageIcon className="w-5 h-5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300"
                          >
                            <Video className="w-5 h-5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 rounded-xl transition-all duration-300"
                          >
                            <FileText className="w-5 h-5" />
                          </motion.button>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05, boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentTab('create')}
                          className="px-6 py-2 bg-gradient-to-r from-blue-100 to-purple-200 text-gray-700 rounded-xl font-medium hover:from-blue-200 hover:to-purple-300 transition-all duration-300 shadow-lg border-2 border-blue-300"
                        >
                          {t('community.createPost.button')}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Enhanced Posts Feed */}
            <AnimatePresence>
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -50, scale: 0.9 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5, boxShadow: "0 25px 50px rgba(0,0,0,0.15)" }}
                  className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden group"
                >
                  {/* Post Header */}
                  <div className="p-4 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-blue-50/50">
                    <div className="flex items-center space-x-3">
                      {otherUsers.find(u => u.uid === post.authorId)?.photoURL ? (
                        <motion.img
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          src={otherUsers.find(u => u.uid === post.authorId)?.photoURL}
                          alt="Author"
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md"
                        />
                      ) : (
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-md"
                        >
                          <User className="w-6 h-6 text-white" />
                        </motion.div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-800">{post.author}</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500">{getTimeAgo(post.timestamp)}</p>
                          <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                          <span className="text-xs text-blue-500 font-medium">{t('community.post.public')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all duration-300"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </motion.button>

                      {/* Post Options Dropdown */}
                      {openMenuPostId === post.id && user?.uid === post.authorId && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-10 bg-white shadow-lg rounded-lg z-50 min-w-max border border-gray-200"
                        >
                          <button
                            onClick={() => {
                              setEditingPostId(post.id);
                              setEditingContent(post.content);
                              setOpenMenuPostId(null);
                            }}
                            disabled={loading}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-600 flex items-center gap-2 disabled:opacity-50"
                          >
                            <Edit2 size={16} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id, post.authorId)}
                            disabled={loading}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 disabled:opacity-50 border-t border-gray-100"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="px-4 pb-3">
                    <p className="text-gray-800 leading-relaxed">{post.content}</p>
                  </div>

                  {/* Post Media */}
                  {post.mediaUrl && (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="w-full overflow-hidden"
                    >
                      {post.mediaType === 'image' ? (
                        <img
                          src={post.mediaUrl}
                          alt="Post media"
                          className="w-full max-h-96 object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <video
                          src={post.mediaUrl}
                          controls
                          className="w-full max-h-96 transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </motion.div>
                  )}

                  {/* Post Stats */}
                  <div className="px-4 py-3 border-t border-gray-100/50 flex items-center justify-between text-sm text-gray-500 bg-gray-50/30">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        <span className="font-medium">{post.likes?.length || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{Object.keys(post.comments).length}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Share2 className="w-4 h-4 text-green-500" />
                      <span className="font-medium">{post.shares} shares</span>
                    </div>
                  </div>

                  {/* Enhanced Action Buttons */}
                  <div className="px-4 py-3 border-t border-gray-100/50 grid grid-cols-3 gap-2 bg-white/50">
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: "rgb(239 246 255)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center justify-center space-x-2 py-3 rounded-xl font-medium transition-all duration-300 ${post.likes?.includes(user?.uid || '')
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-blue-600'
                        }`}
                    >
                      <ThumbsUp className={`w-5 h-5 ${post.likes?.includes(user?.uid || '') ? 'fill-blue-600' : ''}`} />
                      <span>{t('community.post.like')}</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: "rgb(236 253 245)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedPost(selectedPost?.id === post.id ? null : post);
                      }}
                      className="flex items-center justify-center space-x-2 py-3 rounded-xl text-gray-600 hover:text-green-600 font-medium transition-all duration-300"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{t('community.post.comment')}</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: "rgb(254 243 199)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSharePost(post.id)}
                      className="flex items-center justify-center space-x-2 py-3 rounded-xl text-gray-600 hover:text-yellow-600 font-medium transition-all duration-300"
                    >
                      <Share2 className="w-5 h-5" />
                      <span>{t('community.post.share')}</span>
                    </motion.button>
                  </div>

                  {/* Enhanced Comments Section */}
                  {selectedPost?.id === post.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-100/50 bg-gradient-to-r from-gray-50/50 to-blue-50/50"
                    >
                      <div className="max-h-48 overflow-y-auto space-y-3 p-4">
                        <AnimatePresence>
                          {Object.entries(post.comments).map(([id, comment]: [string, any], commentIndex) => (
                            <motion.div
                              key={id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: commentIndex * 0.1 }}
                              className="flex space-x-3"
                            >
                              {otherUsers.find(u => u.uid === comment.authorId)?.photoURL ? (
                                <img
                                  src={otherUsers.find(u => u.uid === comment.authorId)?.photoURL}
                                  alt="Commenter"
                                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-sm">
                                  <User className="w-4 h-4 text-white" />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl shadow-sm border border-white/30 relative group">
                                  <p className="font-medium text-sm text-gray-800">{comment.author}</p>
                                  <p className="text-sm text-gray-700 mt-1">
                                    {editingCommentId === id ? (
                                      <input
                                        type="text"
                                        value={editingCommentContent}
                                        onChange={(e) => setEditingCommentContent(e.target.value)}
                                        className="w-full px-2 py-1 border border-blue-300 rounded"
                                      />
                                    ) : (
                                      comment.content
                                    )}
                                  </p>

                                  {/* Comment Menu Button */}
                                  {(user?.uid === comment.authorId || user?.uid === post.authorId) && (
                                    <motion.button
                                      onClick={() => setOpenCommentMenuId(openCommentMenuId === id ? null : id)}
                                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded"
                                    >
                                      <MoreHorizontal size={14} className="text-gray-400" />
                                    </motion.button>
                                  )}

                                  {/* Comment Options Dropdown */}
                                  {openCommentMenuId === id && (user?.uid === comment.authorId || user?.uid === post.authorId) && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="absolute right-0 top-8 bg-white shadow-lg rounded-lg z-50 min-w-max border border-gray-200"
                                    >
                                      {editingCommentId === id ? (
                                        <>
                                          <button
                                            onClick={() => handleEditComment(post.id, id)}
                                            disabled={loading}
                                            className="w-full text-left px-3 py-1 hover:bg-blue-50 text-blue-600 text-sm disabled:opacity-50"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingCommentId(null);
                                              setEditingCommentContent('');
                                            }}
                                            className="w-full text-left px-3 py-1 hover:bg-gray-50 text-gray-600 text-sm border-t border-gray-100"
                                          >
                                            Cancel
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => {
                                              setEditingCommentId(id);
                                              setEditingCommentContent(comment.content);
                                            }}
                                            className="w-full text-left px-3 py-1 hover:bg-blue-50 text-blue-600 text-sm"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteComment(post.id, id, comment.authorId)}
                                            disabled={loading}
                                            className="w-full text-left px-3 py-1 hover:bg-red-50 text-red-600 text-sm border-t border-gray-100 disabled:opacity-50"
                                          >
                                            Delete
                                          </button>
                                        </>
                                      )}
                                    </motion.div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-gray-500 mt-2 px-3">
                                  <span>{getTimeAgo(comment.timestamp)}</span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      {/* Enhanced Comment Input */}
                      <div className="p-4 border-t border-white/30">
                        <div className="flex items-center space-x-3">
                          {profileData.photoURL ? (
                            <img
                              src={profileData.photoURL}
                              alt="Profile"
                              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-200 shadow-sm"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center shadow-sm">
                              <User className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div className="flex-1 flex items-center bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 shadow-sm">
                            <input
                              type="text"
                              placeholder={t('community.post.addComment')}
                              className="flex-1 text-sm focus:outline-none bg-transparent"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                            />
                            <motion.button
                              whileHover={{ scale: 1.1, rotate: 10 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className="p-1 text-gray-400 hover:text-purple-500 transition-colors"
                            >
                              <Smile className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Edit Post Modal */}
                  {editingPostId === post.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                      onClick={() => {
                        setEditingPostId(null);
                        setEditingContent('');
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Edit Post</h3>
                          <button
                            onClick={() => {
                              setEditingPostId(null);
                              setEditingContent('');
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
                          rows={5}
                        />

                        {error && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                          </div>
                        )}

                        <div className="flex gap-3 mt-4">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEditPost(post.id)}
                            disabled={loading}
                            className="flex-1 bg-blue-500 text-white py-2 rounded-xl font-medium disabled:opacity-50 hover:bg-blue-600"
                          >
                            {loading ? 'Saving...' : 'Save Changes'}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setEditingPostId(null);
                              setEditingContent('');
                            }}
                            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-xl font-medium hover:bg-gray-300"
                          >
                            Cancel
                          </motion.button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={postsEndRef} />
            </div>
          </motion.div>
        )}

        {currentTab === 'messages' && (
          <div className="max-w-2xl mx-auto p-4 space-y-4">
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold mb-4">{t('community.messages.title')}</h2>
              <div className="space-y-3">
                {otherUsers.map((user) => (
                  <div
                    key={user.uid}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                    onClick={() => setCurrentTab('feed')}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="User"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-gray-500 truncate">{user.bio}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${user.isLoggedIn ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentTab === 'notifications' && (
          <div className="max-w-2xl mx-auto p-4 space-y-4">
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold mb-4">{t('community.notifications.title')}</h2>
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start space-x-3 p-2 rounded-lg ${!notification.read ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => {
                        if (!notification.read) {
                          markNotificationAsRead(notification.id);
                        }
                        setSelectedPost(posts.find(post => post.id === notification.postId) || null);
                        setCurrentTab('feed');
                      }}
                    >
                      <div className={`p-2 rounded-full ${!notification.read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        {notification.type === 'like' && <Heart className="w-5 h-5" />}
                        {notification.type === 'comment' && <MessageCircle className="w-5 h-5" />}
                        {notification.type === 'share' && <Share2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm">
                          {notification.type === 'like' && (
                            <span><span className="font-medium">{notification.fromUserName}</span> {t('community.notifications.liked')}</span>
                          )}
                          {notification.type === 'comment' && (
                            <span><span className="font-medium">{notification.fromUserName}</span> {t('community.notifications.commented')}: "{notification.comment}..."</span>
                          )}
                          {notification.type === 'share' && (
                            <span><span className="font-medium">{notification.fromUserName}</span> {t('community.notifications.shared')}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{getTimeAgo(notification.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Bell className="w-12 h-12 text-gray-300" />
                  <p className="text-gray-500 mt-2">{t('community.notifications.empty')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'profile' && (
          <div className="max-w-2xl mx-auto p-4 space-y-4">
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
              <div className="px-4 pb-4 relative">
                <div className="flex justify-between items-start">
                  <div className="flex items-end space-x-4 -mt-12">
                    {profileData.photoURL ? (
                      <img
                        src={profileData.photoURL}
                        alt="Profile"
                        className="w-24 h-24 rounded-full border-4 border-white object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-200 rounded-full border-4 border-white flex items-center justify-center">
                        <User className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold">{profileData.displayName}</h2>
                      <p className="text-gray-600">{profileData.bio}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500 text-white rounded-full text-sm flex items-center space-x-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('community.profile.logout')}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4 space-y-4">
              <h3 className="font-semibold">{t('community.profile.about')}</h3>
              <p className="text-gray-700">{profileData.description || t('community.profile.noBio')}</p>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Globe className="w-4 h-4" />
                <span>Indonesia</span>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-semibold">{t('community.profile.connections')}</h3>
                <div className="flex flex-wrap gap-3 mt-2">
                  {otherUsers.slice(0, 6).map((user) => (
                    <div key={user.uid} className="flex flex-col items-center">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="Connection"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                      <span className="text-xs mt-1">{user.displayName.split(' ')[0]}</span>
                    </div>
                  ))}
                  {otherUsers.length > 6 && (
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xs">+{otherUsers.length - 6}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4 space-y-4">
              <h3 className="font-semibold">{t('community.profile.yourPosts')}</h3>
              {posts.filter(p => p.authorId === user?.uid).length > 0 ? (
                posts
                  .filter(p => p.authorId === user?.uid)
                  .map((post) => (
                    <div key={post.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <p className="text-gray-800">{post.content}</p>
                      {post.mediaUrl && (
                        <div className="mt-2">
                          {post.mediaType === 'image' ? (
                            <img
                              src={post.mediaUrl}
                              alt="Post media"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                          ) : (
                            <video
                              src={post.mediaUrl}
                              controls
                              className="w-full h-48 object-cover rounded-lg"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>{post.likes?.length || 0} likes</span>
                          <span>{Object.keys(post.comments).length} comments</span>
                          <span>{post.shares} shares</span>
                        </div>
                        <span>{getTimeAgo(post.timestamp)}</span>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-gray-500 text-center py-4">{t('community.profile.noPosts')}</p>
              )}
            </div>
          </div>
        )}

        {currentTab === 'create' && (
          <div className="max-w-2xl mx-auto p-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{t('community.createPost.title')}</h2>
                <button
                  onClick={() => setCurrentTab('feed')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-start space-x-3">
                {profileData.photoURL ? (
                  <img
                    src={profileData.photoURL}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div className="flex-1">
                  <textarea
                    placeholder={t('community.createPost.placeholder')}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                    rows={4}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                  />

                  {previewUrl && (
                    <div className="mt-3 relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={handleRemoveMedia}
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        onClick={handleCreatePost}
                        className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm flex items-center space-x-1"
                      >
                        <Send className="w-4 h-4" />
                        <span>{t('community.createPost.button')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialPlatform;
