/**
 * Community CRUD Operations Hook
 * Provides easy-to-use hooks for all community CRUD operations
 */

import { useState, useCallback } from 'react';
import {
  postService,
  commentService,
  profileService,
  engagementService,
  notificationService,
  CreatePostInput,
  CreateCommentInput,
  UpdatePostInput,
} from '../services/communityService';

interface OperationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for Post CRUD operations
 */
export const useCommunityPosts = () => {
  const [state, setState] = useState<OperationState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const createPost = useCallback(async (input: CreatePostInput) => {
    setState({ data: null, loading: true, error: null });
    try {
      const post = await postService.createPost(input);
      setState({ data: post, loading: false, error: null });
      return post;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const getPost = useCallback(async (postId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      const post = await postService.getPost(postId);
      setState({ data: post, loading: false, error: null });
      return post;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const getAllPosts = useCallback(async (limit?: number) => {
    setState({ data: null, loading: true, error: null });
    try {
      const posts = await postService.getAllPosts(limit);
      setState({ data: posts, loading: false, error: null });
      return posts;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const getPostsByUser = useCallback(async (userId: string, limit?: number) => {
    setState({ data: null, loading: true, error: null });
    try {
      const posts = await postService.getPostsByUser(userId, limit);
      setState({ data: posts, loading: false, error: null });
      return posts;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const updatePost = useCallback(async (postId: string, updates: UpdatePostInput) => {
    setState({ data: null, loading: true, error: null });
    try {
      await postService.updatePost(postId, updates);
      setState({ data: postId, loading: false, error: null });
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const deletePost = useCallback(async (postId: string, authorId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      await postService.deletePost(postId, authorId);
      setState({ data: postId, loading: false, error: null });
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  return {
    ...state,
    createPost,
    getPost,
    getAllPosts,
    getPostsByUser,
    updatePost,
    deletePost,
  };
};

/**
 * Hook for Comment CRUD operations
 */
export const useCommunityComments = () => {
  const [state, setState] = useState<OperationState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const createComment = useCallback(async (input: CreateCommentInput) => {
    setState({ data: null, loading: true, error: null });
    try {
      const comment = await commentService.createComment(input);
      setState({ data: comment, loading: false, error: null });
      return comment;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const updateComment = useCallback(async (postId: string, commentId: string, newContent: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      await commentService.updateComment(postId, commentId, newContent);
      setState({ data: commentId, loading: false, error: null });
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const deleteComment = useCallback(async (postId: string, commentId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      await commentService.deleteComment(postId, commentId);
      setState({ data: commentId, loading: false, error: null });
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const getPostComments = useCallback(async (postId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      const comments = await commentService.getPostComments(postId);
      setState({ data: comments, loading: false, error: null });
      return comments;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  return {
    ...state,
    createComment,
    updateComment,
    deleteComment,
    getPostComments,
  };
};

/**
 * Hook for Profile CRUD operations
 */
export const useCommunityProfile = () => {
  const [state, setState] = useState<OperationState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const saveProfile = useCallback(async (userId: string, profileData: any) => {
    setState({ data: null, loading: true, error: null });
    try {
      const profile = await profileService.saveProfile(userId, profileData);
      setState({ data: profile, loading: false, error: null });
      return profile;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const getProfile = useCallback(async (userId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      const profile = await profileService.getProfile(userId);
      setState({ data: profile, loading: false, error: null });
      return profile;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const getPublicProfile = useCallback(async (userId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      const profile = await profileService.getPublicProfile(userId);
      setState({ data: profile, loading: false, error: null });
      return profile;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const addConnection = useCallback(async (userId: string, connectionId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      await profileService.addConnection(userId, connectionId);
      setState({ data: connectionId, loading: false, error: null });
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const removeConnection = useCallback(async (userId: string, connectionId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      await profileService.removeConnection(userId, connectionId);
      setState({ data: connectionId, loading: false, error: null });
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  return {
    ...state,
    saveProfile,
    getProfile,
    getPublicProfile,
    addConnection,
    removeConnection,
  };
};

/**
 * Hook for Engagement operations (likes, shares)
 */
export const useCommunityEngagement = () => {
  const [state, setState] = useState<OperationState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const togglePostLike = useCallback(async (postId: string, userId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      const isLiked = await engagementService.togglePostLike(postId, userId);
      setState({ data: isLiked, loading: false, error: null });
      return isLiked;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const sharePost = useCallback(async (postId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      const shareCount = await engagementService.sharePost(postId);
      setState({ data: shareCount, loading: false, error: null });
      return shareCount;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const toggleCommentLike = useCallback(async (postId: string, commentId: string, userId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      const isLiked = await engagementService.toggleCommentLike(postId, commentId, userId);
      setState({ data: isLiked, loading: false, error: null });
      return isLiked;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  return {
    ...state,
    togglePostLike,
    sharePost,
    toggleCommentLike,
  };
};

/**
 * Hook for Notification operations
 */
export const useCommunityNotifications = () => {
  const [state, setState] = useState<OperationState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const createNotification = useCallback(async (userId: string, type: any, data: any) => {
    setState({ data: null, loading: true, error: null });
    try {
      await notificationService.createNotification(userId, type, data);
      setState({ data: null, loading: false, error: null });
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const markAsRead = useCallback(async (userId: string, notificationId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      await notificationService.markAsRead(userId, notificationId);
      setState({ data: notificationId, loading: false, error: null });
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const deleteNotification = useCallback(async (userId: string, notificationId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      await notificationService.deleteNotification(userId, notificationId);
      setState({ data: notificationId, loading: false, error: null });
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  return {
    ...state,
    createNotification,
    markAsRead,
    deleteNotification,
  };
};
