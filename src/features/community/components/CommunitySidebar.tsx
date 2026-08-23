import React from 'react';
import type { ChannelListUIProps } from 'stream-chat-react';
import { MessagesSquare } from 'lucide-react';
import { NewConversationButton } from './NewConversationModal';

export function CommunitySidebarHeader() {
  return (
    <div className="nh-community__sidebar-header">
      <div className="nh-community__brand">
        <span className="nh-community__brand-mark" aria-hidden="true">
          <MessagesSquare size={20} />
        </span>
        <span className="nh-community__brand-name">NueroConnect</span>
      </div>
      <NewConversationButton />
    </div>
  );
}

export function CommunityChannelList({
  children,
  error,
  loading,
}: React.PropsWithChildren<ChannelListUIProps>) {
  return (
    <div className="nh-community__channel-list" role="listbox" aria-label="Conversations">
      {loading ? (
        <div className="nh-community__sidebar-note" role="status">
          Loading conversations…
        </div>
      ) : error ? (
        <div
          className="nh-community__sidebar-note nh-community__sidebar-note--error"
          role="alert"
        >
          Could not load conversations.
        </div>
      ) : (
        children
      )}
    </div>
  );
}
