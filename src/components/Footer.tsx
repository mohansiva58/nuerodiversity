import React from 'react';
import { Heart, Brain, Mail, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  return (
    <>
      <footer className="bg-white text-gray-900 border-t border-gray-200">
        <div className="container mx-auto px-6 py-12 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand Section */}
            <div>
              <div className="flex items-center space-x-3 mb-6 animate-slide-up">
                <Brain className="h-8 w-8 text-indigo-600 animate-pulse" />
                <span className="font-bold text-2xl text-gray-900">NeuroHub</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {t('footer.brand')}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-xl text-gray-900 mb-6">{t('footer.quickLinks')}</h3>
              <ul className="space-y-4">
                <li className="animate-slide-up delay-100">
                  <a
                    href="/about"
                    className="text-gray-600 hover:text-indigo-600 transition-colors duration-200"
                  >
                    {t('footer.aboutUs')}
                  </a>
                </li>
                <li className="animate-slide-up delay-200">
                  <a
                    href="/contact"
                    className="text-gray-600 hover:text-indigo-600 transition-colors duration-200"
                  >
                    {t('footer.contact')}
                  </a>
                </li>
                <li className="animate-slide-up delay-300">
                  <a
                    href="/privacy"
                    className="text-gray-600 hover:text-indigo-600 transition-colors duration-200"
                  >
                    {t('footer.privacy')}
                  </a>
                </li>
                <li className="animate-slide-up delay-400">
                  <a
                    href="/terms"
                    className="text-gray-600 hover:text-indigo-600 transition-colors duration-200"
                  >
                    {t('footer.terms')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Us */}
            <div>
              <h3 className="font-semibold text-xl text-gray-900 mb-6">{t('footer.contactUs')}</h3>
              <ul className="space-y-4">
                <li className="flex items-center space-x-3 animate-slide-up delay-100">
                  <Mail className="h-5 w-5 text-indigo-600 animate-bounce-slow" />
                  <a
                    href="mailto:support@neurohub.com"
                    className="text-gray-600 hover:text-indigo-600 transition-colors duration-200"
                  >
                    nuero@gmail.com
                  </a>
                </li>
                <li className="flex items-center space-x-3 animate-slide-up delay-200">
                  <Phone className="h-5 w-5 text-indigo-600 animate-bounce-slow" />
                  <span className="text-gray-600">+91 9346491221</span>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="font-semibold text-xl text-gray-900 mb-6">{t('footer.newsletter')}</h3>
              <form className="space-y-4">
                <input
                  type="email"
                  placeholder={t('footer.emailPlaceholder')}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 animate-slide-up delay-100"
                />
                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium shadow-md animate-slide-up delay-200"
                >
                  {t('footer.subscribe')}
                </button>
              </form>
            </div>
          </div>

          {/* Scrolling Text Section */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center relative">
            <div className="scrolling-text">
              <p className="text-gray-600 text-sm flex items-center justify-center">
                {t('footer.madeWith')} <Heart className="h-4 w-4 mx-1 text-red-500 animate-pulse" /> {t('footer.forCommunity')}
              </p>
            </div>
          </div>

          {/* Moving Background Element */}
          <div className="moving-bg absolute inset-0 pointer-events-none overflow-hidden">
            <div className="bg-indigo-100 opacity-20 rounded-full w-72 h-72 absolute animate-float" style={{ top: '-50px', left: '-50px' }}></div>
            <div className="bg-indigo-100 opacity-20 rounded-full w-96 h-96 absolute animate-float-slow" style={{ bottom: '-100px', right: '-100px' }}></div>
          </div>
        </div>
      </footer>

      {/* Custom CSS for Animations */}
      <style >{`
        /* Slide Up Animation */
        .animate-slide-up {
          animation: slideUp 0.6s ease-out forwards;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Slow Bounce Animation for Icons */
        .animate-bounce-slow {
          animation: bounceSlow 2s infinite ease-in-out;
        }

        @keyframes bounceSlow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        /* Scrolling Text Animation */
        .scrolling-text {
          overflow: hidden;
          white-space: nowrap;
          position: relative;
        }

        .scrolling-text p {
          display: inline-block;
          animation: scrollText 10s linear infinite;
        }

        @keyframes scrollText {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        /* Floating Background Elements */
        .animate-float {
          animation: float 6s infinite ease-in-out;
        }

        .animate-float-slow {
          animation: float 8s infinite ease-in-out;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-40px) translateX(0);
          }
          75% {
            transform: translateY(-20px) translateX(-10px);
          }
        }
      `}</style>
    </>
  );
};

export default Footer;