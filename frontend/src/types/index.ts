export interface Session {
    userId: string;
    email: string;
    name: string;
  }
  
  export interface State<T> {
    status: "idle" | "loading" | "success" | "error";
    data: T | null;
    error: string;
  }
  
  export interface Email {
    id: string;
    from: string;
    date: string;
    subject: string;
    snippet: string;
    body: string;
  }
  
  export interface Digest {
    content: string;
    digestDate?: string;
    createdAt?: string;
  }
  
  export interface AskMatch {
    emailId?: string;
    fromEmail?: string;
    internalDate?: string;
    subject?: string;
    content?: string;
  }
  
  export interface AskResponse {
    answer: string;
    matches: AskMatch[];
  }
  
  export interface ActionConfig {
    key: string;
    label: string;
    description: string;
    path: string;
  }