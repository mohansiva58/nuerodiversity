/**
 * Community CRUD Integration Examples
 * Copy-paste these snippets into your Community.tsx
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: Create Post with Media
// ═══════════════════════════════════════════════════════════════════════════════

import { useCommunityPosts, useCommunityComments, useCommunityEngagement } from '../hooks/useCommunity';

const ExampleCreatePost = () => {
  const { createPost, loading, error } = useCommunityPosts();
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const { user } = useAuth();

  const handleCreatePost = async () => {
    if (!content.trim() && !mediaFile) {
      alert('Please add content or media');
      return;
    }

    try {
      const newPost = await createPost({
        content,
        authorId: user?.uid || '',
        displayName: user?.displayName || 'Anonymous',
        mediaFile: mediaFile || undefined,
      });
      
      console.log('Post created successfully:', newPost);
      setContent('');
      setMediaFile(null);
    } catch (err) {
      console.error('Failed to create post:', err);
      alert(error || 'Failed to create post');
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        className="w-full p-2 border rounded"
      />
      
      <input
        type="file"
        accept="image/*,video/*"
        onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
        className="my-2"
      />

      <button
        onClick={handleCreatePost}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Posting...' : 'Post'}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: Delete Post
// ═══════════════════════════════════════════════════════════════════════════════

const ExampleDeletePost = ({ postId, authorId }: { postId: string; authorId: string }) => {
  const { deletePost, loading } = useCommunityPosts();
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  // Only allow deletion by post author
  if (user?.uid !== authorId) {
    return null;
  }

  const handleDelete = async () => {
    try {
      await deletePost(postId, authorId);
      console.log('Post deleted successfully');
      setShowConfirm(false);
      // Refresh posts or remove from UI
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-red-500 hover:text-red-700"
      >
        Delete
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <p className="mb-4">Are you sure you want to delete this post?</p>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: Edit Post
// ═══════════════════════════════════════════════════════════════════════════════

const ExampleEditPost = ({
  postId,
  initialContent,
  authorId,
}: {
  postId: string;
  initialContent: string;
  authorId: string;
}) => {
  const { updatePost, loading } = useCommunityPosts();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(initialContent);

  if (user?.uid !== authorId) {
    return null;
  }

  const handleUpdate = async () => {
    try {
      await updatePost(postId, { content: editedContent });
      setIsEditing(false);
      console.log('Post updated successfully');
    } catch (err) {
      console.error('Failed to update post:', err);
      alert((err as Error).message);
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-blue-500 hover:text-blue-700"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-96">
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          rows={4}
        />
        <div className="flex gap-4">
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: Add Comment with Delete
// ═══════════════════════════════════════════════════════════════════════════════

const ExampleCommentSection = ({ postId, authorId }: { postId: string; authorId: string }) => {
  const { createComment, loading: createLoading } = useCommunityComments();
  const { deleteComment, loading: deleteLoading } = useCommunityComments();
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const comment = await createComment({
        content: newComment,
        authorId: user?.uid || '',
        displayName: user?.displayName || 'Anonymous',
        postId,
      });
      setComments([...comments, comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert((err as Error).message);
    }
  };

  const handleDeleteComment = async (commentId: string, commentAuthorId: string) => {
    if (user?.uid !== commentAuthorId && user?.uid !== authorId) {
      alert('You can only delete your own comments');
      return;
    }

    try {
      await deleteComment(postId, commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
      alert((err as Error).message);
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded">
      <div className="mb-4">
        {comments.map((comment) => (
          <div key={comment.id} className="mb-3 p-2 bg-white rounded">
            <p className="font-semibold text-sm">{comment.author}</p>
            <p className="text-gray-700">{comment.content}</p>
            
            {(user?.uid === comment.authorId || user?.uid === authorId) && (
              <button
                onClick={() => handleDeleteComment(comment.id, comment.authorId)}
                disabled={deleteLoading}
                className="text-xs text-red-500 hover:text-red-700 mt-1"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={handleAddComment}
          disabled={createLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {createLoading ? '...' : 'Comment'}
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE 5: Like/Share Post
// ═══════════════════════════════════════════════════════════════════════════════

const ExamplePostEngagement = ({ postId, initialLikes }: { postId: string; initialLikes: string[] }) => {
  const { togglePostLike, sharePost, loading } = useCommunityEngagement();
  const { user } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [shareCount, setShareCount] = useState(0);
  const isLiked = likes.includes(user?.uid || '');

  const handleToggleLike = async () => {
    try {
      const newLikeStatus = await togglePostLike(postId, user?.uid || '');
      if (newLikeStatus) {
        setLikes([...likes, user?.uid || '']);
      } else {
        setLikes(likes.filter(id => id !== user?.uid));
      }
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleShare = async () => {
    try {
      const newCount = await sharePost(postId);
      setShareCount(newCount);
    } catch (err) {
      console.error('Failed to share post:', err);
    }
  };

  return (
    <div className="flex gap-4 mt-4 pt-4 border-t">
      <button
        onClick={handleToggleLike}
        disabled={loading}
        className={`flex items-center gap-2 ${
          isLiked ? 'text-red-500' : 'text-gray-500'
        } hover:text-red-500 disabled:opacity-50`}
      >
        <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
        {likes.length} Likes
      </button>

      <button
        onClick={handleShare}
        disabled={loading}
        className="flex items-center gap-2 text-gray-500 hover:text-blue-500 disabled:opacity-50"
      >
        <Share2 size={20} />
        {shareCount} Shares
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE 6: Profile Update
// ═══════════════════════════════════════════════════════════════════════════════

import { useCommunityProfile } from '../hooks/useCommunity';

const ExampleProfileUpdate = ({ userId }: { userId: string }) => {
  const { saveProfile, getProfile, loading, error } = useCommunityProfile();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Load existing profile
    const loadProfile = async () => {
      try {
        const profile = await getProfile(userId);
        if (profile) {
          setDisplayName(profile.displayName || '');
          setBio(profile.bio || '');
          setStatus(profile.status || '');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };

    loadProfile();
  }, [userId]);

  const handleSaveProfile = async () => {
    try {
      await saveProfile(userId, {
        displayName,
        bio,
        status,
        connections: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      alert('Profile updated successfully');
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert(error || 'Failed to update profile');
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow max-w-md">
      <h3 className="text-lg font-bold mb-4">Edit Profile</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full p-2 border rounded"
          rows={3}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Status</label>
        <input
          type="text"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="Online, Busy, Away..."
          className="w-full p-2 border rounded"
        />
      </div>

      <button
        onClick={handleSaveProfile}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Profile'}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export {
  ExampleCreatePost,
  ExampleDeletePost,
  ExampleEditPost,
  ExampleCommentSection,
  ExamplePostEngagement,
  ExampleProfileUpdate,
};
