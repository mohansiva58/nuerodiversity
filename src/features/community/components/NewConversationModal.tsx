import React, { useState } from 'react';
import type { UserResponse } from 'stream-chat';
import { useChatContext } from 'stream-chat-react';
import { Check, Plus, Search, UserRound, Users, X } from 'lucide-react';
import { getDistinctChannelId } from '../services/streamChat';

export function NewConversationButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="nh-community__new-chat"
        onClick={() => setOpen(true)}
        aria-label="Start a new conversation"
        title="New conversation"
      >
        <Plus size={18} />
      </button>
      {open && <NewConversationModal onClose={() => setOpen(false)} />}
    </>
  );
}

function NewConversationModal({ onClose }: { onClose: () => void }) {
  const { client, setActiveChannel } = useChatContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResponse[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    setBusy(true);
    try {
      const response = await client.queryUsers(
        { name: { $autocomplete: value.trim() } },
        { name: 1 },
        { limit: 8 }
      );
      setResults(response.users.filter((user) => user.id !== client.userID));
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  const toggleUser = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startConversation = async () => {
    if (!client.userID || selected.size === 0) return;
    const members = [client.userID, ...Array.from(selected)];
    const id = getDistinctChannelId(members);
    setStarting(true);
    setError(null);
    try {
      const channel = client.channel('messaging', id, { members });
      await channel.create();
      setActiveChannel(channel);
      onClose();
    } catch {
      setError('Could not start the conversation. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      className="nh-community__modal-overlay"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="nh-community__modal"
        role="dialog"
        aria-modal="true"
        aria-label="New conversation"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="nh-community__modal-header">
          <h2>New conversation</h2>
          <button
            type="button"
            className="nh-community__modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="nh-community__modal-search">
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => runSearch(event.target.value)}
            placeholder="Search people by name…"
            autoFocus
          />
        </div>

        <div className="nh-community__modal-results">
          {busy ? (
            <div className="nh-community__modal-note">Searching…</div>
          ) : results.length === 0 ? (
            <div className="nh-community__modal-note">
              {query.trim() ? 'No people found.' : 'Type a name to find someone.'}
            </div>
          ) : (
            results.map((user) => (
              <button
                type="button"
                key={user.id}
                className="nh-community__user-row"
                onClick={() => toggleUser(user.id)}
              >
                <span className="nh-community__user-avatar">
                  {user.image ? <img src={user.image} alt="" /> : <UserRound size={16} />}
                </span>
                <span className="nh-community__user-name">{user.name ?? user.id}</span>
                <span className="nh-community__user-check" aria-hidden="true">
                  {selected.has(user.id) && <Check size={16} />}
                </span>
              </button>
            ))
          )}
        </div>

        {error && <div className="nh-community__modal-error">{error}</div>}

        <div className="nh-community__modal-footer">
          <button
            type="button"
            className="nh-community__modal-start"
            disabled={selected.size === 0 || starting}
            onClick={startConversation}
          >
            <Users size={16} aria-hidden="true" />
            {starting
              ? 'Creating…'
              : selected.size === 0
                ? 'Start a chat'
                : selected.size === 1
                  ? 'Start direct message'
                  : `Start group chat (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
