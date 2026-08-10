# Job Chatbot Setup Guide

## Overview

RozgarVaani now includes an AI-powered chatbot that helps users with government job queries. The chatbot uses NVIDIA's Llama 3.1 Nemotron 70B model for intelligent, context-aware responses about job vacancies, eligibility, application processes, and career guidance.

## Features

✅ **Intelligent Responses**: Context-aware answers about government jobs  
✅ **Multi-page Access**: Available from all public pages via floating button  
✅ **Quick Suggestions**: Pre-built questions for common job queries  
✅ **Professional UI**: Beautiful, responsive chat interface  
✅ **NVIDIA Powered**: High-quality responses using cutting-edge AI  
✅ **Job-focused**: Specialized in government recruitment queries  

## Quick Start

### 1. Add NVIDIA Chatbot API Key

Add these variables to your `.env` file:

```env
# Use same key as main NVIDIA API or create separate key for chatbot
NVIDIA_CHATBOT_API_KEY="your_nvidia_api_key_here"

# Optional: Use Llama 3.1 for better conversation (recommended)
CHATBOT_MODEL="nvidia/llama-3.1-nemotron-70b-instruct"
```

### 2. Deployment Options

#### Option A: Same API Key (Simpler)
Use the same NVIDIA API key for both pipeline and chatbot:
```env
NVIDIA_API_KEY="your_key_here"
NVIDIA_CHATBOT_API_KEY="your_key_here"  # Same as above
```

#### Option B: Separate API Key (Recommended)
Create a separate NVIDIA API key for chatbot:
1. Visit: https://integrate.api.nvidia.com
2. Generate new API key
3. Use different key for chatbot for better usage tracking

### 3. Start the Application

```bash
# Build the application
npm run build

# Start the server
npm start
```

## Chatbot Behavior

### What the Chatbot Can Do

🎯 **Job Vacancies**
- Latest government job openings
- Eligibility criteria (age, qualification)
- Application deadlines and procedures

📋 **Application Guidance**
- Step-by-step application processes
- Document requirements and verification
- Fee payment methods and deadlines

📚 **Exam Preparation**
- Exam patterns and syllabus
- Study materials and preparation tips
- Important dates and centers

💰 **Career Information**
- Salary structures and pay scales
- Career growth opportunities
- Benefits and allowances

❓ **General Queries**
- Reservation policies and age relaxation
- Selection process details
- Result checking procedures

### Example Questions Users Can Ask

1. "What are the latest SSC CGL vacancies?"
2. "How can I apply for railway jobs?"
3. "What is the age limit for UPSC exams?"
4. "Which jobs are available for engineering graduates?"
5. "How to prepare for bank PO exams?"
6. "What documents are needed for police recruitment?"
7. "What is the salary of a government teacher?"
8. "Are there any defense jobs for 12th pass?"
9. "How to check my application status?"
10. "What is the selection process for SSC CHSL?"

## Architecture

### Frontend Components
- **JobChatBot.tsx**: Main chat interface with floating button
- **App.tsx**: Chatbot state management and integration
- **CSS**: Custom styling with amber gradient theme

### Backend Services
- **jobChatbotService.ts**: NVIDIA API integration with context injection
- **server.ts**: Chatbot API endpoints (`/api/chatbot/*`)

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chatbot/chat` | POST | Generate AI responses |
| `/api/chatbot/suggestions` | GET | Get suggested questions |
| `/api/chatbot/extract-entities` | POST | Extract job entities |
| `/api/chatbot/test` | GET | Test chatbot connection |

## Configuration Details

### Environment Variables

```env
# REQUIRED: NVIDIA API Key
NVIDIA_CHATBOT_API_KEY="your_key_here"

# OPTIONAL: Chatbot Model (default: Llama 3.1 70B)
CHATBOT_MODEL="nvidia/llama-3.1-nemotron-70b-instruct"

# OPTIONAL: Use main NVIDIA key as fallback
NVIDIA_API_KEY="your_main_key"
```

### Model Options

1. **Recommended**: `nvidia/llama-3.1-nemotron-70b-instruct`
   - Better conversation quality
   - More coherent responses
   - Higher context understanding

2. **Alternative**: `nvidia/nvidia-nemotron-nano-9b-v2`
   - Same model as main pipeline
   - Lower computational cost
   - Faster responses

## Testing the Chatbot

### 1. Test Connection
```bash
curl http://localhost:3000/api/chatbot/test
```

### 2. Send Test Query
```bash
curl -X POST http://localhost:3000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the latest government job openings?"}'
```

### 3. Get Suggestions
```bash
curl http://localhost:3000/api/chatbot/suggestions
```

## UI Features

### Floating Chat Button
- Amber gradient button with pulse animation
- Always visible in bottom-right corner
- Opens expandable chat window
- Click to open/close

### Chat Window Features
- **Message History**: Conversation persistence
- **Auto-scroll**: Always shows latest messages
- **Quick Suggestions**: Pre-built question chips
- **Typing Indicator**: Shows "Thinking..." animation
- **Timestamps**: Message timing display
- **User/Assistant Avatars**: Clear role distinction

### Responsive Design
- **Desktop**: Fixed position, 600px max height
- **Tablet**: Responsive sizing
- **Mobile**: Full-screen on small devices
- **Accessibility**: Keyboard navigation support

## Customization

### 1. Modify System Prompt
Edit `JOB_ASSISTANT_SYSTEM_PROMPT` in `jobChatbotService.ts` to change:
- Chatbot personality
- Response guidelines
- Expertise areas
- Communication style

### 2. Change UI Theme
Modify CSS in `JobChatBot.tsx`:
- Colors (search for `amber-500`, `amber-600`)
- Button styling
- Message bubble design
- Animation effects

### 3. Add Context Data
The chatbot automatically includes:
- Current job listings (recent 5 jobs)
- Available job categories
- User conversation history

## Monitoring and Logs

### Chatbot Performance
- API latency tracked in response object
- Success/failure logging to console
- Error handling with fallback messages

### Usage Statistics
- Each API call logged in server
- Conversation history in client state
- Error rates and response times

## Troubleshooting

### Common Issues

1. **"Chatbot API connection failed"**
   - Check NVIDIA API key in `.env`
   - Verify internet connectivity
   - Test API key at https://integrate.api.nvidia.com

2. **Slow responses**
   - Check network latency
   - Consider using smaller model
   - Enable response streaming (future feature)

3. **No job context in responses**
   - Verify database connection
   - Check if jobs exist in database
   - Test `/api/jobs` endpoint

4. **UI not appearing**
   - Check browser console for errors
   - Verify build completed successfully
   - Clear browser cache

### Debug Commands

```bash
# Check chatbot status
curl http://localhost:3000/api/chatbot/test

# Test with sample question
curl -X POST http://localhost:3000/api/chatbot/chat \
  -d '{"message": "Hello"}' \
  -H "Content-Type: application/json"

# Verify frontend build
npm run build
```

## Cost Considerations

### API Usage
- **Free Tier**: NVIDIA offers free credits for testing
- **Production**: Monitor usage and set limits
- **Recommendation**: Use separate keys for pipeline vs chatbot

### Optimization Tips
1. **Response Length**: Limited to 1000 tokens
2. **Context Window**: Only recent 10 messages
3. **Model Choice**: Nano 9B vs Llama 70B cost difference
4. **Caching**: Future enhancement for common queries

## Security

### API Key Protection
- Never commit keys to repository
- Use environment variables
- Rotate keys periodically
- Monitor usage for anomalies

### User Input Validation
- Message length limited to 1000 characters
- Input sanitization on server
- Rate limiting (future enhancement)
- Content filtering (future enhancement)

## Future Enhancements

### Planned Features
1. **Voice Input**: Speech-to-text for queries
2. **Multilingual Support**: Hindi and regional languages
3. **File Upload**: Resume analysis and job matching
4. **Notifications**: Job alert integration
5. **Analytics Dashboard**: Chatbot usage statistics

### Technical Improvements
1. **Response Streaming**: Real-time token generation
2. **Cache System**: Store common responses
3. **Rate Limiting**: Prevent abuse
4. **Context Optimization**: Better job data integration

## Support

### Getting Help
1. **Documentation**: Check this guide
2. **GitHub Issues**: Report bugs and feature requests
3. **NVIDIA Support**: API key and model questions
4. **Community**: RozgarVaani user community

### Contact
- **Email**: [Add support email]
- **GitHub**: [Repository link]
- **Documentation**: [Link to docs]

---

🚀 **Happy Chatting!** The chatbot is now ready to help thousands of job seekers find their perfect government job opportunities.  
