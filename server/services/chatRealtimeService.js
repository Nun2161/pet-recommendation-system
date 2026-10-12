"use strict";

const db = require("../config/db");

const clients = new Map();
const pendingOfflineTimers = new Map();
const OFFLINE_GRACE_MS = 15_000;

function actorKey(actor) {
  return `${actor.type}:${Number(actor.id)}`;
}

function writeEvent(response, event, data) {
  if (!response || response.writableEnded) return;
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data ?? {})}\n\n`);
}

function isOnline(actor) {
  const key = actorKey(actor);
  return (clients.get(key)?.size || 0) > 0 || pendingOfflineTimers.has(key);
}

function addClient(actor, response) {
  const key = actorKey(actor);
  const pendingTimer = pendingOfflineTimers.get(key);
  const wasOffline = (clients.get(key)?.size || 0) === 0 && !pendingTimer;
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingOfflineTimers.delete(key);
  }
  const set = clients.get(key) || new Set();
  set.add(response);
  clients.set(key, set);
  return wasOffline;
}

function removeClient(actor, response) {
  const key = actorKey(actor);
  const set = clients.get(key);
  if (!set) return false;
  set.delete(response);
  if (set.size === 0) {
    clients.delete(key);
    return true;
  }
  return false;
}

function publishToActor(actor, event, data) {
  const set = clients.get(actorKey(actor));
  if (!set) return;
  [...set].forEach((response) => writeEvent(response, event, data));
}

function publishToActors(actors, event, data, options = {}) {
  const excludeKey = options.exclude ? actorKey(options.exclude) : "";
  const unique = new Map();
  (actors || []).forEach((actor) => unique.set(actorKey(actor), actor));
  unique.forEach((actor, key) => {
    if (key !== excludeKey) publishToActor(actor, event, data);
  });
}

function publishAll(event, data) {
  clients.forEach((set) => {
    [...set].forEach((response) => writeEvent(response, event, data));
  });
}

async function markLastSeen(actor) {
  try {
    await db.query(
      `INSERT INTO chat_presence (participant_type, participant_id, last_seen_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP`,
      [actor.type, actor.id]
    );
  } catch (error) {
    console.warn("Chat presence update warning:", error.message);
  }
}

function connect(actor, response) {
  const firstConnection = addClient(actor, response);
  writeEvent(response, "connected", {
    actor: { type: actor.type, id: actor.id },
    online: true,
  });

  if (firstConnection) {
    publishAll("presence", {
      actor: { type: actor.type, id: actor.id },
      online: true,
      last_seen_at: null,
    });
  }

  const heartbeat = setInterval(() => {
    if (!response.writableEnded) response.write(": heartbeat\n\n");
  }, 20_000);

  let disconnected = false;
  const disconnect = () => {
    if (disconnected) return;
    disconnected = true;
    clearInterval(heartbeat);
    const becameTemporarilyOffline = removeClient(actor, response);
    if (!becameTemporarilyOffline) return;

    const key = actorKey(actor);
    const timer = setTimeout(() => {
      pendingOfflineTimers.delete(key);
      if ((clients.get(key)?.size || 0) > 0) return;
      const lastSeen = new Date().toISOString();
      void markLastSeen(actor);
      publishAll("presence", {
        actor: { type: actor.type, id: actor.id },
        online: false,
        last_seen_at: lastSeen,
      });
    }, OFFLINE_GRACE_MS);
    pendingOfflineTimers.set(key, timer);
  };

  response.on("close", disconnect);
  response.on("error", disconnect);
}

module.exports = {
  actorKey,
  connect,
  isOnline,
  publishToActor,
  publishToActors,
};
