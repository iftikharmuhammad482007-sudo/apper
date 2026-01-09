
export interface DeployedApp {
  id: string;
  name: string;
  description: string;
  code: string;
  timestamp: number;
  author: string;
  domain?: string; // The custom planet domain chosen by the user
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  code?: string;
  timestamp: number;
}

export interface AppState {
  messages: Message[];
  currentCode: string;
  isGenerating: boolean;
  status: 'idle' | 'generating' | 'error' | 'published' | 'choosing_domain';
}
