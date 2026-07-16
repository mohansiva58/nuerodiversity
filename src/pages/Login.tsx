import React, { useState, useEffect } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

interface AuthPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const Login: React.FC<AuthPopupProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' } | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const { user, login } = useAuth();

  // Reset state when the popup opens
  useEffect(() => {
    if (isOpen) {
      setIsLogin(true);
      setEmail('');
      setPassword('');
      setFullName('');
      setError(null);
      setIsForgotPasswordOpen(false);
      setResetEmail('');
      setResetError(null);
      setResetSuccess(null);
      setToast(null);
      setShowWelcomePopup(false);
    }
  }, [isOpen]);

  // Close popup if user is already logged in when component mounts
  useEffect(() => {
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Auto-hide welcome popup after 5 seconds if not closed manually
  useEffect(() => {
    if (showWelcomePopup) {
      const timer = setTimeout(() => setShowWelcomePopup(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showWelcomePopup]);

  const saveUserToFirestore = async (
    user: { uid: string; email: string | null; displayName: string | null; providerData: { providerId: string }[] },
    additionalData: { fullName?: string } = {}
  ) => {
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || additionalData.fullName,
        provider: user.providerData[0].providerId,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error('Error saving user to Firestore', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;
      login(loggedInUser);
      setShowWelcomePopup(true);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      await saveUserToFirestore(newUser, { fullName });
      login(newUser);
      setShowWelcomePopup(true);
      setIsLogin(true);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('email-already-in-use')) {
        setError('Email already exists. Please use a different email or log in.');
      } else {
        setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await saveUserToFirestore(result.user);
      login(result.user);
      setShowWelcomePopup(true);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google Sign-in failed. Please try again.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess('Password reset email sent. Please check your inbox.');
      setIsForgotPasswordOpen(false);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'Failed to send password reset email. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setToast({ message: 'Logged out successfully.', type: 'success' });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Logout failed. Please try again.');
    }
  };

  if (!isOpen || user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        className="bg-white w-full max-w-sm p-6 rounded-lg relative"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-black">
            {isLogin ? 'Welcome Back to NueroHub!' : 'Sign Up to NueroHub!'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Keep your data safe</p>
        </div>
        {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}
        <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-3">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
            required
          />
          <button
            type="submit"
            className="w-full py-2 bg-yellow-400 text-black font-semibold rounded-full hover:bg-yellow-500 transition-colors duration-200 text-sm"
          >
            {isLogin ? 'LOGIN' : 'SIGN UP'}
          </button>
        </form>
        <button
          onClick={handleGoogleLogin}
          className="w-full py-2 bg-white border border-gray-200 rounded-full mt-3 flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors duration-200 text-sm"
        >
          <FcGoogle className="h-5 w-5" />
          <span className="text-black">{isLogin ? 'Login with Google' : 'Sign up with Google'}</span>
        </button>
        <div className="mt-4 text-center">
          {isLogin && (
            <p className="text-yellow-400 mb-2 text-sm">
              <button
                onClick={() => setIsForgotPasswordOpen(true)}
                className="hover:underline"
              >
                Forgot Password?
              </button>
            </p>
          )}
          <p className="text-gray-500 text-sm">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-yellow-400 hover:underline ml-1"
            >
              {isLogin ? 'Register!' : 'Login!'}
            </button>
          </p>
          <p className="text-gray-500 mt-2 text-sm">
            Do you have any question?{' '}
            <a href="mailto:nuerohub@email.com" className="text-yellow-400 hover:underline">
              nuerohub@email.com
            </a>
          </p>
          {user && (
            <p className="mt-2 text-gray-500 text-sm">
              <button
                onClick={handleLogout}
                className="text-yellow-400 hover:underline"
              >
                Logout
              </button>
            </p>
          )}
        </div>
      </motion.div>
      {isForgotPasswordOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white w-full max-w-sm p-6 rounded-lg relative">
            <button
              onClick={() => setIsForgotPasswordOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-black">Reset Password</h1>
              <p className="text-gray-500 mt-2 text-sm">
                Please use the link below to reset your password
              </p>
            </div>
            {resetError && <p className="text-red-500 text-center mb-4 text-sm">{resetError}</p>}
            {resetSuccess && <p className="text-green-500 text-center mb-4 text-sm">{resetSuccess}</p>}
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                required
              />
              <button
                type="submit"
                className="w-full py-2 bg-yellow-400 text-black font-semibold rounded-full hover:bg-yellow-500 transition-colors duration-200 text-sm"
              >
                SEND RESET EMAIL
              </button>
            </form>
            <p className="text-gray-500 text-center mt-4 text-sm">
              Do you have any question?{' '}
              <a href="mailto:nuerohub@email.com" className="text-yellow-400 hover:underline">
                nuerohub@email.com
              </a>
            </p>
          </div>
        </motion.div>
      )}
      <AnimatePresence>
        {showWelcomePopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          >
            <motion.div
              className="bg-white p-6 rounded-lg max-w-sm text-center"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
            >
              <button
                onClick={() => setShowWelcomePopup(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold text-black mb-4">
                Welcome back, {user?.displayName || user?.email || 'User'}!
              </h2>
              <p className="text-gray-500 mb-4 text-sm">Ready to continue your journey?</p>
              <button
                onClick={() => setShowWelcomePopup(false)}
                className="w-full py-2 bg-yellow-400 text-black font-semibold rounded-full hover:bg-yellow-500 transition-colors duration-200 text-sm"
              >
                CONTINUE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-4 right-4 p-3 bg-yellow-400 text-black rounded-lg shadow-lg z-50 flex items-center space-x-2"
          >
            <Check className="h-5 w-5" />
            <span className="text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;