import React, { useMemo } from 'react';
import { useChannelPreviewInfo, useChatContext } from 'stream-chat-react';
import { ArrowLeft, Users } from 'lucide-react';

function getChannelStatus(
  channel: ReturnType<typeof useChatContext>['channel'],
  currentUserId?: string
): string | null {
  if (!channel) return null;

  const memberCount = channel.data?.member_count;
  const members = Object.values(channel.state?.members ?? {});

  if (memberCount === 2 || (members.length === 2 && !memberCount)) {
    const other = members.find((member) => member.user_id !== currentUserId);
    if (other?.user?.online) return 'Online';
    if (other) return 'Offline';
    return null;
  }

  const watchers = Object.values(channel.state?.watchers ?? {});
  const online = watchers.filter((user) => user.online).length;
  if ((memberCount ?? 0) > 0 && online > 0) return `${online} online`;
  if ((memberCount ?? 0) > 0) return `${memberCount} members`;
  return null;
}

export function CommunityChannelHeader() {
  const { channel, client, setActiveChannel } = useChatContext();
  const { displayImage, displayTitle } = useChannelPreviewInfo({ channel });

  const status = useMemo(
    () => getChannelStatus(channel, client.userID ?? undefined),
    [channel, client.userID]
  );

  if (!channel) return null;

  return (
    <div className="nh-community__channel-header">
      <button
        type="button"
        className="nh-community__back"
        onClick={() => setActiveChannel(undefined)}
        aria-label="Back to conversations"
      >
        <ArrowLeft size={20} />
      </button>
      <span className="nh-community__channel-avatar" aria-hidden="true">
        {displayImage ? <img src={displayImage} alt="" /> : <Users size={20} />}
      </span>
      <div className="nh-community__channel-meta">
        <span className="nh-community__channel-title">{displayTitle ?? 'Conversation'}</span>
        {status && <span className="nh-community__channel-status">{status}</span>}
      </div>
    </div>
  );
}
