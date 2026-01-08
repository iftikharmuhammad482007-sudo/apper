
export interface DeployedApp {
  id: string;
  name: string;
  description: string;
  code: string;
  timestamp: number;
  author: string;
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
  status: 'idle' | 'generating' | 'error' | 'published';
}
