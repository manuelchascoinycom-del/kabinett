'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export type BatchWebSocketEvent = {
  event: 'batch_started' | 'receive_progress' | 'batch_completed' | 'batch_cancelled';
  collection_id: string;
  document_id?: string;
  processed?: number;
  total?: number;
  errors?: number;
  status?: 'completed' | 'cancelled' | 'error';
  error?: string;
};

export type BatchWebSocketState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getWebSocketUrl = (collectionId: string, token: string): string => {
  const apiUrl = new URL(API_BASE_URL);
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  apiUrl.pathname = `/ws/batch-processing/${collectionId}`;
  apiUrl.search = new URLSearchParams({ token }).toString();
  return apiUrl.toString();
};

export const useBatchWebSocket = (
  collectionId: string,
  enabled: boolean,
  onEvent: (event: BatchWebSocketEvent) => void,
) => {
  const { token } = useAuth();
  const [state, setState] = useState<BatchWebSocketState>('idle');
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let retryCount = 0;
    let disposed = false;

    const connect = () => {
      if (disposed) return;

      setState('connecting');
      socket = new WebSocket(getWebSocketUrl(collectionId, token));

      socket.onopen = () => {
        retryCount = 0;
        setState('open');
      };

      socket.onmessage = (message) => {
        try {
          onEventRef.current(JSON.parse(message.data) as BatchWebSocketEvent);
        } catch (error) {
          console.error('Invalid batch WebSocket event', error);
        }
      };

      socket.onerror = () => {
        setState('error');
        socket?.close();
      };

      socket.onclose = () => {
        if (disposed) return;

        setState('closed');
        const delay = Math.min(1000 * 2 ** retryCount, 10000);
        retryCount += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [collectionId, enabled, token]);

  return state;
};