import { AgentCapabilities } from './agentCapabilities';

export interface AgentAdapter {
  providerId: string;
  displayName: string;
  detectAvailability(): Promise<boolean>;
  getCapabilities(): AgentCapabilities;
  provideContext(context: string): Promise<AgentHandoffResult>;
  dispose?(): void;
}

export interface AgentHandoffResult {
  method: 'copy-assisted' | 'automatic' | 'unavailable';
  message: string;
}
