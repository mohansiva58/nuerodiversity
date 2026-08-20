import React, { useMemo } from 'react';
import {
  Channel,
  ChannelList,
  MessageComposer,
  MessageList,
  Thread,
  Window,
  WithComponents,
  useChatContext,
} from 'stream-chat-react';
import type { ComponentContextValue } from 'stream-chat-react';
import { CommunityChannelList, CommunitySidebarHeader } from './CommunitySidebar';
import { CommunityChannelHeader } from './CommunityChannelHeader';

export interface CommunityLayoutProps {
  userId: string;
}

function CommunityChat({ userId }: CommunityLayoutProps) {
  const { channel: activeChannel } = useChatContext();

  const filters = useMemo(
    () => ({ members: { $in: [userId] }, type: 'messaging' }),
    [userId]
  );
  const sort = useMemo(() => ({ last_message_at: -1 }), []);
  const options = useMemo(() => ({ state: true, presence: true }), []);

  const overrides = useMemo<Partial<ComponentContextValue>>(
    () => ({
      ChannelListHeader: CommunitySidebarHeader,
      ChannelListUI: CommunityChannelList,
    }),
    []
  );

  return (
    <div
      className={
        activeChannel
          ? 'nh-community nh-community--channel-open'
          : 'nh-community nh-community--list-open'
      }
    >
      <WithComponents overrides={overrides}>
        <ChannelList
          filters={filters}
          sort={sort}
          options={options}
          showChannelSearch
          setActiveChannelOnMount={false}
        />
        <Channel>
          <Window>
            <CommunityChannelHeader />
            <MessageList />
            <MessageComposer />
          </Window>
          <Thread />
        </Channel>
      </WithComponents>
    </div>
  );
}

export function CommunityLayout({ userId }: CommunityLayoutProps) {
  return <CommunityChat userId={userId} />;
}
