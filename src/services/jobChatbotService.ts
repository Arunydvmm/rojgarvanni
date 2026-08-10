/**
 * Job Chatbot Service - NVIDIA-powered assistant for job seekers
 * 
 * Provides contextual responses about government job vacancies,
 * application processes, eligibility criteria, and career guidance.
 * Uses a separate NVIDIA API key for chatbot operations.
 */

import axios, { AxiosInstance } from 'axios';

// Chatbot-specific NVIDIA configuration - use same config as main pipeline
const CHATBOT_API_KEY = process.env.NVIDIA_CHATBOT_API_KEY || process.env.NVIDIA_API_KEY;
const CHATBOT_API_BASE = 'https://integrate.api.nvidia.com/v1';
// Use the same model as main pipeline to avoid 403 issues
const CHATBOT_MODEL = process.env.NVIDIA_MODEL || 'nvidia/nvidia-nemotron-nano-9b-v2';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  jobs?: any[];
  categories?: string[];
  recentJobs?: any[];
  userQuery?: string;
}

export interface ChatbotResponse {
  success: boolean;
  message: string;
  sources?: string[];
  confidence?: number;
}

/**
 * Job-focused system prompt for the chatbot
 */
const JOB_ASSISTANT_SYSTEM_PROMPT = `You are RozgarVaani, a helpful AI assistant specialized in Indian government job recruitment. Your primary focus is:

🎯 EXPERTISE AREAS:
- Government job vacancies (SSC, UPSC, Railway, Banking, Defence, Police, Teaching, Healthcare, State/Central Government)
- Application processes and eligibility criteria
- Exam patterns, syllabus, and preparation strategies
- Salary structures, pay scales, and career growth
- Age relaxation rules and reservation policies
- Document requirements and application procedures

📋 RESPONSE GUIDELINES:
1. Provide accurate, factual information about job vacancies
2. Help candidates understand eligibility criteria (age, qualification, experience)
3. Guide users through application processes step-by-step
4. Explain exam patterns, selection processes, and important dates
5. Share tips for exam preparation and document verification
6. Clarify doubts about salary, pay scales, and benefits

🚫 LIMITATIONS:
- Do NOT provide personal opinions on political matters
- Do NOT guarantee job selection or make false promises
- Do NOT recommend unethical practices or shortcuts
- If you don't know specific details, acknowledge it honestly
- Always encourage users to verify information from official sources

💡 COMMUNICATION STYLE:
- Friendly, professional, and encouraging
- Use simple language accessible to all education levels
- Provide structured responses with bullet points when helpful
- Include relevant deadlines, dates, and official websites
- Offer follow-up questions to better assist users

🔗 CONTEXT AWARENESS:
- You have access to current job listings in the system
- Reference specific job details when users ask about them
- Provide personalized responses based on available job data
- Suggest relevant job openings based on user preferences

Remember: Your goal is to help Indian job seekers navigate the government recruitment process successfully!`;

/**
 * Create NVIDIA API client for chatbot
 */
function createChatbotClient(): AxiosInstance {
  if (!CHATBOT_API_KEY) {
    throw new Error('NVIDIA Chatbot API key not configured. Set NVIDIA_CHATBOT_API_KEY in environment.');
  }

  return axios.create({
    baseURL: CHATBOT_API_BASE,
    headers: {
      'Authorization': `Bearer ${CHATBOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

/**
 * Build context-aware prompt with job data
 */
function buildContextualPrompt(context: ChatContext): string {
  let contextPrompt = '';

  if (context.recentJobs && context.recentJobs.length > 0) {
    contextPrompt += '\n\n📊 CURRENT JOB LISTINGS IN SYSTEM:\n';
    context.recentJobs.slice(0, 5).forEach((job: any, idx: number) => {
      contextPrompt += `${idx + 1}. ${job.title} at ${job.organization}\n`;
      contextPrompt += `   - Vacancies: ${job.totalVacancies || 'N/A'}\n`;
      contextPrompt += `   - Category: ${job.category || 'N/A'}\n`;
      contextPrompt += `   - Last Date: ${job.applicationEnd || 'N/A'}\n`;
      if (job.qualification) {
        contextPrompt += `   - Qualification: ${job.qualification}\n`;
      }
      contextPrompt += '\n';
    });
  }

  if (context.categories && context.categories.length > 0) {
    contextPrompt += `\n📁 AVAILABLE JOB CATEGORIES: ${context.categories.join(', ')}\n`;
  }

  return contextPrompt;
}

/**
 * Generate chatbot response using NVIDIA API
 */
export async function generateChatbotResponse(
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  context: ChatContext = {}
): Promise<ChatbotResponse> {
  try {
    const client = createChatbotClient();

    // Build system prompt with context
    const contextPrompt = buildContextualPrompt(context);
    const systemPrompt = JOB_ASSISTANT_SYSTEM_PROMPT + contextPrompt;

    // Prepare messages for API
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: userMessage }
    ];

    // Call NVIDIA API
    const response = await client.post('/chat/completions', {
      model: CHATBOT_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.9,
    });

    const assistantMessage = response.data.choices[0]?.message?.content || 
      'I apologize, but I could not generate a response. Please try again.';

    return {
      success: true,
      message: assistantMessage,
      confidence: 0.85,
      sources: ['NVIDIA Nemotron 70B', 'RozgarVaani Job Database']
    };

  } catch (error: any) {
    console.error('[Chatbot] Error generating response:', error.message);
    
    // Check for 403 error specifically
    if (error.response?.status === 403) {
      console.error('[Chatbot] 403 Forbidden Error Details:');
      console.error('  - API Key configured:', !!CHATBOT_API_KEY);
      console.error('  - Model being used:', CHATBOT_MODEL);
      console.error('  - API Base URL:', CHATBOT_API_BASE);
      console.error('  - Error details:', error.response?.data || 'No additional details');
      
      return {
        success: false,
        message: 'Chatbot API access denied (403). Please check NVIDIA API key configuration. Using cached job data for now.',
      };
    }

    // Return fallback response
    return {
      success: false,
      message: 'I\'m currently experiencing technical difficulties. Please try again in a moment, or browse our job listings directly. For urgent queries, contact our support team.',
    };
  }
}

/**
 * Test chatbot connection
 */
export async function testChatbotConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
  try {
    const client = createChatbotClient();
    const start = Date.now();

    const response = await client.post('/chat/completions', {
      model: CHATBOT_MODEL,
      messages: [
        { role: 'user', content: 'Hello, are you available?' }
      ],
      max_tokens: 50,
    });

    const latency = Date.now() - start;

    return {
      success: true,
      message: `Chatbot API connected successfully (latency: ${latency}ms)`,
      latency
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Chatbot API connection failed: ${error.message}`
    };
  }
}

/**
 * Get suggested questions for users
 */
export function getSuggestedQuestions(): string[] {
  return [
    "What are the latest government job openings?",
    "How can I apply for SSC CGL 2026?",
    "What is the age limit for railway jobs?",
    "Which government jobs are available for 12th pass candidates?",
    "How to prepare for UPSC Civil Services exam?",
    "What documents are required for government job applications?",
    "What is the salary of a Bank PO?",
    "Are there any jobs for engineering graduates?",
    "How to check application status?",
    "What is the selection process for defence jobs?"
  ];
}

/**
 * Extract job-related entities from user message
 */
export function extractJobEntities(message: string): {
  categories: string[];
  organizations: string[];
  qualifications: string[];
  keywords: string[];
} {
  const lowerMessage = message.toLowerCase();

  const categories = [
    'ssc', 'upsc', 'railway', 'banking', 'defence', 'police',
    'teaching', 'healthcare', 'engineering', 'state government', 'central government'
  ].filter(cat => lowerMessage.includes(cat));

  const organizations = [
    'sbi', 'ibps', 'rrb', 'ssb', 'cisf', 'bsf', 'army', 'navy', 'air force',
    'upsc', 'ssc', 'railway'
  ].filter(org => lowerMessage.includes(org));

  const qualifications = [
    '10th', '12th', 'graduate', 'post graduate', 'engineering', 'medical',
    'diploma', 'iti', 'mba', 'ca'
  ].filter(qual => lowerMessage.includes(qual));

  const keywords = [
    'vacancy', 'job', 'recruitment', 'notification', 'application',
    'exam', 'admit card', 'result', 'syllabus', 'salary', 'age limit'
  ].filter(keyword => lowerMessage.includes(keyword));

  return { categories, organizations, qualifications, keywords };
}
