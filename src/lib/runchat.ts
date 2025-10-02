import fetch from 'node-fetch';

interface RunChatInput {
  sheetid: string;
  SheetRequest: string;
}

interface RunChatResponse {
  metadata: string;
  runchat_instance_id: string;
  data: Array<{
    id: string;
    label: string;
    type: string;
    description: string;
    data: any[];
  }>;
}

interface RunChatSchema {
  inputs: Array<{
    id: string;
    label: string;
    type: string;
    description: string;
    data: any;
  }>;
  outputs: Array<{
    id: string;
    label: string;
    type: string;
    description: string;
    data: any;
  }>;
  name: string;
}

export class RunChatService {
  private apiKey: string;
  private runchatId: string;
  private baseUrl: string = 'https://runchat.app/api/v1';

  constructor() {
    this.apiKey = process.env.RUNCHAT_API_KEY || '';
    this.runchatId = process.env.RUNCHAT_ID || '';
    
    if (!this.apiKey || !this.runchatId) {
      throw new Error('Missing RunChat API credentials. Please check your .env file.');
    }
  }

  /**
   * Get the schema for the RunChat flow
   */
  async getSchema(): Promise<RunChatSchema> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.runchatId}/schema`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`RunChat schema request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json() as RunChatSchema;
    } catch (error) {
      console.error('Error fetching RunChat schema:', error);
      throw error;
    }
  }

  /**
   * Execute the RunChat flow with article analysis
   */
  async analyzeArticles(sheetId: string, sheetRequest: string): Promise<RunChatResponse> {
    try {
      const inputs: RunChatInput = {
        sheetid: sheetId,
        SheetRequest: sheetRequest
      };

      const response = await fetch(`${this.baseUrl}/${this.runchatId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: inputs
        })
      });

      if (!response.ok) {
        throw new Error(`RunChat analysis request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json() as RunChatResponse;
    } catch (error) {
      console.error('Error running RunChat analysis:', error);
      throw error;
    }
  }

  /**
   * Continue an existing RunChat instance
   */
  async continueAnalysis(instanceId: string, sheetId: string, sheetRequest: string): Promise<RunChatResponse> {
    try {
      const inputs: RunChatInput = {
        sheetid: sheetId,
        SheetRequest: sheetRequest
      };

      const response = await fetch(`${this.baseUrl}/${this.runchatId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          runchat_instance_id: instanceId,
          inputs: inputs
        })
      });

      if (!response.ok) {
        throw new Error(`RunChat continue request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json() as RunChatResponse;
    } catch (error) {
      console.error('Error continuing RunChat analysis:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const runchatService = new RunChatService();