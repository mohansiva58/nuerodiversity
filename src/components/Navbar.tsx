/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, BookOpen, Gamepad2, Calendar, Users, Brain, Settings, FileText, MessageSquare, User, LogOut, CheckCircle, Microscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SpeechText } from '../components/speach';
import { useAuth } from '../pages/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import SoundToggle from './SoundToggle';
import Login from '../pages/Login';

const Navbar = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState<'login' | 'logout' | null>(null);
  const [profileImageError, setProfileImageError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navigation = [
    { name: t('nav.home'), href: '/', icon: Home },
    { name: t('nav.learning'), href: '/learning', icon: BookOpen },
    { name: t('nav.games'), href: '/games', icon: Gamepad2 },
    { name: t('nav.daily'), href: '/daily', icon: Calendar },
    { name: t('nav.community'), href: '/community', icon: Users },
    { name: t('nav.assessment'), href: '/assessment', icon: Brain },
    { name: t('nav.organs'), href: '/organs', icon: Microscope },
  ];

  const profileMenu = [
    { name: t('nav.settings'), href: '/settings', icon: Settings },
    { name: t('nav.blog'), href: '/blog', icon: FileText },
    { name: t('nav.articles'), href: '/articles', icon: MessageSquare },
    { name: t('nav.about'), href: '/about', icon: FileText },
    { name: t('buttons.logout'), href: '#', icon: LogOut, onClick: () => handleLogout(), hide: !user },
  ];

  const handleLogout = () => {
    logout();
    setShowSuccess('logout');
    setIsProfileOpen(false);
    navigate('/login');
  };

  const handleLoginSuccess = () => {
    setIsLoginOpen(false);
    setShowSuccess('login');
  };

  const handleLoginClick = () => {
    setIsLoginOpen(true);
  };

  const handleCloseLogin = () => {
    setIsLoginOpen(false);
  };

  const getUserInitials = () => {
    if (user?.displayName?.trim()) {
      const nameParts = user.displayName.trim().split(/\s+/);
      return nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : nameParts[0][0].toUpperCase();
    }

    if (user?.email?.trim()) {
      return user.email[0].toUpperCase();
    }

    return 'U';
  };

  useEffect(() => {
    setProfileImageError(false);
  }, [user?.photoURL]);

  useEffect(() => {
    if (user) {
      console.log('User Data:', {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });
    }
  }, [user]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // Mobile Bottom Navigation Items
  const mobileNavItems = [
    { name: t('nav.home'), href: '/', icon: Home },
    { name: t('nav.learning'), href: '/learning', icon: BookOpen },
    { name: t('nav.games'), href: '/games', icon: Gamepad2 },
    { name: t('nav.daily'), href: '/daily', icon: Calendar },
    { name: t('nav.community'), href: '/community', icon: Users },

    { name: t('nav.assessment'), href: '/assessment', icon: Brain },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
    { name: t('nav.organs'), href: '/organs', icon: Microscope },

  ];

  return (
    <>
      {/* Desktop Navigation - Unchanged */}
      <nav className="hidden md:block bg-black text-white shadow-lg fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Brain className="h-8 w-8" />
              <SpeechText>
                <span className="font-bold text-xl">NeuroHub</span>
              </SpeechText>
            </Link>

            <div className="flex space-x-4 items-center">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium ${location.pathname === item.href ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-900'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <SpeechText>
                      <span>{item.name}</span>
                    </SpeechText>
                  </Link>
                );
              })}

              <LanguageSwitcher variant="dropdown" showFlags={true} showNativeNames={true} />
              <SoundToggle variant="icon" />

              <div className="relative">
                {user ? (
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    aria-label="User Profile"
                  >
                    {user.photoURL && !profileImageError ? (
                      <img
                        src={user.photoURL}
                        alt={`${user.displayName || 'User'}'s Profile`}
                        className="w-full h-full object-cover rounded-full"
                        onError={() => setProfileImageError(true)}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-gray-700 rounded-full">
                        <SpeechText>
                          <span className="text-sm font-semibold">{getUserInitials()}</span>
                        </SpeechText>
                      </div>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleLoginClick}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    aria-label="Login"
                  >
                    <User className="h-5 w-5" />
                  </button>
                )}
                {isProfileOpen && user && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-xl bg-gradient-to-b from-gray-900 to-black border border-gray-800 transform origin-top-right transition-all duration-200 ease-in-out z-50">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <SpeechText>
                        <p className="text-sm font-medium text-white truncate">{user.displayName || 'User'}</p>
                      </SpeechText>
                      <SpeechText>
                        <p className="text-xs text-gray-300 truncate">{user.email}</p>
                      </SpeechText>
                    </div>
                    <div className="py-1">
                      {profileMenu.map((item) => {
                        if (item.hide) return null;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={item.onClick || (() => setIsProfileOpen(false))}
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 hover:text-white transition-colors duration-150"
                          >
                            <Icon className="h-4 w-4 text-gray-300" />
                            <SpeechText>
                              <span>{item.name}</span>
                            </SpeechText>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Header */}
      <nav className="md:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm z-50 border-b border-gray-100 h-14 transition-all duration-300">
        <div className="flex items-center justify-between h-full px-3 gap-2">

          {/* Left to right: Logo -> Language -> Mic */}
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="flex items-center space-x-2 min-w-0">
              <div className="bg-black p-1.5 rounded-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight text-gray-900 truncate">NEUROHUB</span>
            </Link>

            <LanguageSwitcher
              variant="dropdown"
              showFlags={false}
              showNativeNames={false}
              className="language-switcher--mobile"
            />

            <SoundToggle variant="icon" className="!bg-gray-100 !text-gray-700 hover:!bg-gray-200" />
          </div>

          {/* Right: Profile/Menu */}
          <div>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
            >
              {user?.photoURL && !profileImageError ? (
                <img
                  src={user.photoURL}
                  alt="Menu"
                  className="w-full h-full object-cover"
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
                  {getUserInitials()}
                </div>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Full 5 Items */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 pb-safe">
        <div className="flex items-center justify-around h-16 px-1">
          {mobileNavItems.map((item) => {
            const isActive = item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform duration-150"
              >
                <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-black text-white shadow-lg translate-y-[-4px]' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  {isActive && (
                    <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-black rounded-full opacity-0"></span>
                  )}
                </div>
                {!isActive && (
                  <span className="text-[10px] font-medium text-gray-400 tracking-wide">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Menu Overlay (Offcanvas) */}
      {isProfileOpen && (
        <div className="md:hidden fixed inset-0 z-[55]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsProfileOpen(false)}
          />

          {/* Menu Content */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4 animate-slide-up max-h-[85vh] overflow-y-auto pb-8">
            {/* Drag Handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Menu</h2>
              <button onClick={() => setIsProfileOpen(false)} className="p-2 bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* User Info Card */}
            <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-md">
                {user?.photoURL && !profileImageError ? (
                  <img
                    src={user.photoURL}
                    alt="User"
                    className="w-full h-full object-cover"
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-900 text-white flex items-center justify-center text-xl font-bold">
                    {getUserInitials()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                {user ? (
                  <>
                    <h3 className="font-bold text-lg text-gray-900">{user.displayName || 'Traveler'}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </>
                ) : (
                  <button
                    onClick={() => { setIsProfileOpen(false); handleLoginClick(); }}
                    className="font-bold text-indigo-600"
                  >
                    Login / Sign Up
                  </button>
                )}
              </div>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="col-span-2 p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <span className="text-lg">🌐</span>
                  </div>
                  <span className="font-medium text-gray-700">Language</span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <LanguageSwitcher variant="inline" className="scale-90 origin-right" />
                </div>
              </div>

              <div className="col-span-2 p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <span className="text-lg">🔊</span>
                  </div>
                  <span className="font-medium text-gray-700">Mic / Voice</span>
                </div>
                <SoundToggle variant="button" className="scale-90 origin-right" />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="space-y-2 mb-6">
              <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <Settings className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">{t('nav.settings')}</span>
              </Link>
            </div>

            {/* Logout */}
            {user && (
              <button
                onClick={handleLogout}
                className="w-full py-4 text-center text-red-500 font-bold bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
              >
                {t('buttons.logout')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add padding to bottom of mobile layout to prevent content hiding */}
      <div className="md:hidden h-16" />

      {/* Login Popup */}
      <Login
        isOpen={isLoginOpen}
        onClose={handleCloseLogin}
        onLoginSuccess={handleLoginSuccess}
        {...({} as any)}
      />

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60]">
          <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-xl animate-fade-in flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <SpeechText>
              <span className="font-medium">{showSuccess === 'login' ? t('system.loginSuccess') : t('system.logoutSuccess')}</span>
            </SpeechText>
          </div>
        </div>
      )}
    </>
  );
};



export default Navbar;