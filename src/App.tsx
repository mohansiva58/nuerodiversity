import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { FloatingChatbot } from './components/FloatingChatbot';
import { AuthProvider } from './pages/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import GlobalTTS from './components/GlobalTTS';
import { SafeArea } from './components/TouchAware';
import { useResponsive } from './hooks/useResponsive';

const Home = lazy(() => import('./pages/Home'));
const Learning = lazy(() => import('./pages/Learning'));
const Games = lazy(() => import('./pages/Games'));
const Daily = lazy(() => import('./pages/Daily'));
const Community = lazy(() => import('./pages/Community'));
const Assessment = lazy(() => import('./pages/Assessment'));
const Login = lazy(() => import('./pages/Login'));
const CourseDetail = lazy(() => import('./CourseDetail'));
const Blog = lazy(() => import('./pages/Blog'));
const RAGChat = lazy(() => import('./pages/RAGChat'));  // ← RAG Chat is now main chatbot
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const About = lazy(() => import('./pages/About'));
const Organs = lazy(() => import('./pages/Organs'));
const Articles = lazy(() => import('./pages/Articles '));
const NotFound = lazy(() => import('./pages/NotFound'));

function AppContent() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginRoute = location.pathname === '/login';

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoginOpen(true); // Show login popup after 1 minute
    }, 60000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <GlobalTTS />
      <FloatingChatbot />
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Suspense fallback={<div className="py-10 text-center text-sm text-gray-500">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/learning" element={<Learning />} />
              <Route path="/coursedetail" element={<CourseDetail />} />
              <Route path="/games" element={<Games />} />
              <Route path="/daily" element={<Daily />} />
              <Route path="/community" element={<Community />} />
              <Route path="/assessment" element={<Assessment />} />
              <Route path="/chatbot" element={<RAGChat />} />
              <Route path="/rag-chat" element={<RAGChat />} />
              <Route
                path="/login"
                element={null}
              />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/about" element={<About />} />
              <Route path="/organs" element={<Organs />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <Suspense fallback={null}>
          <Login
            isOpen={isLoginOpen || isLoginRoute}
            onClose={() => {
              setIsLoginOpen(false);
              if (isLoginRoute) {
                navigate('/');
              }
            }}
          />
        </Suspense>
      </div>
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AppContent />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;