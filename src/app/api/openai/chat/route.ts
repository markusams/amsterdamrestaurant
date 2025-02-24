import { OpenAIStream, StreamingTextResponse } from 'ai';
import { Configuration, OpenAIApi } from 'openai-edge';

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY || '',
});
const openai = new OpenAIApi(config);

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Log request details
    console.log('Chat API request received:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Parse request body
    let messages;
    try {
      const body = await req.json();
      messages = body.messages;
      console.log('Request body parsed successfully');
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response('Invalid request body', { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log('Invalid messages format:', messages);
      return new Response('Messages must be a non-empty array', { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key missing');
      return new Response('OpenAI API key not configured', { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log messages being sent
    console.log('Making request to OpenAI with messages:', 
      messages.map((m: any) => ({
        role: m.role,
        contentPreview: m.content?.substring(0, 50) + '...',
        contentLength: m.content?.length
      }))
    );

    // Make request to OpenAI
    let response;
    try {
      response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        stream: true,
        messages: messages.map((message: any) => ({
          content: message.content,
          role: message.role,
        }))
      });
    } catch (e: any) {
      console.error('OpenAI API request failed:', {
        error: e,
        message: e.message,
        response: e.response
      });
      return new Response(
        JSON.stringify({ error: 'Failed to get response from OpenAI' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('OpenAI response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    // Handle non-200 responses
    if (!response.ok) {
      console.error('OpenAI returned non-200 status:', response.status);
      return new Response(
        JSON.stringify({ error: `OpenAI returned status ${response.status}` }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);

    // Respond with the stream
    return new StreamingTextResponse(stream);
  } catch (error: any) {
    // Log the full error details
    console.error('Unhandled error in chat API:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });

    return new Response(
      JSON.stringify({ 
        error: error?.message || 'An error occurred during your request.',
        details: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          stack: error.stack,
          cause: error.cause
        } : undefined
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
