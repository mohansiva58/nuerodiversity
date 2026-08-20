import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessagesSquare } from 'lucide-react';
import { useAuth } from '../../../pages/AuthContext';
import { StreamChatProvider } from './StreamChatProvider';
import { CommunityLayout } from './CommunityLayout';
import 'stream-chat-react/dist/css/index.css';
import '../styles/community.css';

function CommunityLoginPrompt() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="nh-community__login">
      <div className="nh-community__login-card">
        <span className="nh-community__login-icon" aria-hidden="true">
          <MessagesSquare size={28} />
        </span>
        <h1>{t('community.header.title')}</h1>
        <p>{t('community.errors.login')}</p>
        <button type="button" onClick={() => navigate('/login')}>
          {t('community.errors.loginBtn')}
        </button>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { user } = useAuth();

  if (!user) {
    return <CommunityLoginPrompt />;
  }

  return (
    <div className="nh-community-page">
      <StreamChatProvider firebaseUser={user}>
        <CommunityLayout userId={user.uid} />
      </StreamChatProvider>
    </div>
  );
}
