"use client";

type ClientLogPayload = {
  action: string;
  status: "success" | "failure";
  message?: string;
  reason?: string;
  clientCode?: string;
  docId?: string;
  details?: Record<string, unknown>;
};

type QueuedLog = ClientLogPayload & {
  clientTime: string;
  clientPath: string;
};

const STORAGE_KEY = "audit_log_queue_v1";
const MAX_QUEUE = 200;

let flushing = false;
let syncInitialized = false;

const readQueue = (): QueuedLog[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedLog[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: QueuedLog[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
};

const enqueueLog = (item: QueuedLog) => {
  const queue = readQueue();
  queue.push(item);
  if (queue.length > MAX_QUEUE) {
    queue.splice(0, queue.length - MAX_QUEUE);
  }
  writeQueue(queue);
};

export const flushClientLogs = async () => {
  if (typeof window === "undefined") return;
  if (flushing) return;
  const queue = readQueue();
  if (queue.length === 0) return;

  flushing = true;
  try {
    const remaining: QueuedLog[] = [];
    for (const item of queue) {
      try {
        const res = await fetch("/api/client-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          remaining.push(item);
          break;
        }
      } catch {
        remaining.push(item);
        break;
      }
    }
    writeQueue(remaining);
  } finally {
    flushing = false;
  }
};

export const startClientLogSync = () => {
  if (typeof window === "undefined") return;
  if (syncInitialized) return;
  syncInitialized = true;
  window.addEventListener("online", () => {
    void flushClientLogs();
  });
  void flushClientLogs();
};

export const logClientEvent = async (payload: ClientLogPayload) => {
  if (typeof window === "undefined") return;
  startClientLogSync();

  const item: QueuedLog = {
    ...payload,
    clientTime: new Date().toISOString(),
    clientPath: window.location.pathname,
  };

  try {
    const res = await fetch("/api/client-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      enqueueLog(item);
      return;
    }
    await flushClientLogs();
  } catch {
    enqueueLog(item);
  }
};
