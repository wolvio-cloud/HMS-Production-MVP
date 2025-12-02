import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('QueueGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Broadcast queue update to all connected clients
   */
  broadcastQueueUpdate(event: {
    type: 'patient_added' | 'patient_updated' | 'patient_removed' | 'stage_changed';
    patientId: string;
    patientToken?: number;
    stage?: string;
    doctorId?: string;
    data?: any;
  }) {
    this.logger.log(`Broadcasting: ${event.type} for patient ${event.patientToken || event.patientId}`);
    this.server.emit('queue:update', event);
  }

  /**
   * Broadcast to specific doctor
   */
  broadcastToDoctor(doctorId: string, event: any) {
    this.logger.log(`Broadcasting to doctor ${doctorId}`);
    this.server.to(`doctor:${doctorId}`).emit('doctor:update', event);
  }

  /**
   * Subscribe to doctor-specific updates
   */
  @SubscribeMessage('subscribe:doctor')
  handleDoctorSubscribe(client: Socket, payload: { doctorId: string }) {
    client.join(`doctor:${payload.doctorId}`);
    this.logger.log(`Doctor ${payload.doctorId} subscribed to updates`);
    return { success: true };
  }

  /**
   * Unsubscribe from doctor updates
   */
  @SubscribeMessage('unsubscribe:doctor')
  handleDoctorUnsubscribe(client: Socket, payload: { doctorId: string }) {
    client.leave(`doctor:${payload.doctorId}`);
    this.logger.log(`Doctor ${payload.doctorId} unsubscribed from updates`);
    return { success: true };
  }

  /**
   * Subscribe to specific queue (vitals, lab, pharmacy, etc.)
   */
  @SubscribeMessage('subscribe:queue')
  handleQueueSubscribe(client: Socket, payload: { queueType: string }) {
    client.join(`queue:${payload.queueType}`);
    this.logger.log(`Client subscribed to ${payload.queueType} queue`);
    return { success: true };
  }
}
