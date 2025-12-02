import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface QueueUpdateEvent {
  type: 'patient_added' | 'patient_updated' | 'patient_removed' | 'stage_changed';
  patientId: string;
  patientToken?: number;
  stage?: string;
  doctorId?: string;
  data?: any;
}

interface UseQueueUpdatesOptions {
  /**
   * Callback when queue update event is received
   */
  onQueueUpdate?: (event: QueueUpdateEvent) => void;

  /**
   * Callback when doctor-specific update is received
   */
  onDoctorUpdate?: (event: any) => void;

  /**
   * Doctor ID to subscribe to doctor-specific updates
   */
  doctorId?: string;

  /**
   * Whether to connect automatically (default: true)
   */
  autoConnect?: boolean;
}

/**
 * Custom hook for real-time queue updates via WebSocket
 *
 * @example
 * ```tsx
 * const { isConnected, subscribe } = useQueueUpdates({
 *   onQueueUpdate: (event) => {
 *     console.log('Queue updated:', event);
 *     refreshQueue();
 *   },
 *   doctorId: user.id,
 * });
 * ```
 */
export function useQueueUpdates(options: UseQueueUpdatesOptions = {}) {
  const {
    onQueueUpdate,
    onDoctorUpdate,
    doctorId,
    autoConnect = true,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('✅ WebSocket already connected');
      return;
    }

    console.log('🔌 Connecting to WebSocket:', WEBSOCKET_URL);

    const socket = io(WEBSOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      isConnectedRef.current = true;

      // Auto-subscribe to doctor updates if doctorId provided
      if (doctorId) {
        socket.emit('subscribe:doctor', { doctorId });
        console.log(`📡 Subscribed to doctor updates: ${doctorId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      isConnectedRef.current = false;
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      isConnectedRef.current = false;
    });

    // Listen for queue updates
    socket.on('queue:update', (event: QueueUpdateEvent) => {
      console.log('📥 Queue update received:', event);
      onQueueUpdate?.(event);
    });

    // Listen for doctor-specific updates
    socket.on('doctor:update', (event: any) => {
      console.log('📥 Doctor update received:', event);
      onDoctorUpdate?.(event);
    });

    socketRef.current = socket;
  }, [doctorId, onQueueUpdate, onDoctorUpdate]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting WebSocket');
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  /**
   * Subscribe to specific queue
   */
  const subscribeToQueue = useCallback((queueName: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:queue', { queue: queueName });
      console.log(`📡 Subscribed to queue: ${queueName}`);
    }
  }, []);

  /**
   * Subscribe to doctor-specific updates
   */
  const subscribeToDoctor = useCallback((doctorIdParam: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:doctor', { doctorId: doctorIdParam });
      console.log(`📡 Subscribed to doctor updates: ${doctorIdParam}`);
    }
  }, []);

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
    connect,
    disconnect,
    subscribeToQueue,
    subscribeToDoctor,
    socket: socketRef.current,
  };
}
