import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { findRelevantDocuments } from '@/lib/embeddings';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/auth-options';

if (!process.env.GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
}

// Function to check if a query is drug-related
function isDrugRelatedQuery(query: string): boolean {
  const drugKeywords = [
    'drug', 'medicine', 'medication', 'pill', 'tablet', 'capsule', 'injection',
    'prescription', 'treatment', 'therapy', 'pharmacy', 'pharmacist', 'dosage',
    'side effect', 'contraindication', 'interaction', 'overdose', 'allergy',
    'antibiotic', 'painkiller', 'antidepressant', 'vitamin', 'supplement'
  ];
  
  const lowerQuery = query.toLowerCase();
  return drugKeywords.some(keyword => lowerQuery.includes(keyword));
}

// Function to retry API calls with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (error instanceof Error && error.message.includes('503')) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

// Function to clean and format the response
function formatResponse(text: string): string {
  // Remove any special characters and extra whitespace
  let cleaned = text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  // Convert markdown-style lists to bullet points
  cleaned = cleaned
    .replace(/^\s*[-*]\s/gm, '• ') // Convert markdown list items
    .replace(/^\s*\d+\.\s/gm, '• ') // Convert numbered lists
    .replace(/\n{3,}/g, '\n\n'); // Replace multiple newlines with double newline

  // Ensure each bullet point is on a new line
  cleaned = cleaned.replace(/•/g, '\n•');

  // Ensure section headers are on their own line, but don't add extra newlines
  cleaned = cleaned.replace(/([A-Z\s:]+:)/g, '\n$1');

  // Clean up any resulting double newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format:', messages);
      return NextResponse.json(
        { error: 'Messages must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get the last user message
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'user')?.content;

    if (!lastUserMessage) {
      return NextResponse.json(
        { error: 'No user message found' },
        { status: 400 }
      );
    }

    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let responseText = "I apologize, but I couldn't process your request. Please try again.";

    // Initialize the model and prepare the prompt
    const initializeModel = async () => {
      try {
        if (isDrugRelatedQuery(lastUserMessage)) {
          // For drug-related queries, use RAG
          console.log('Finding relevant documents...');
          const relevantDocs = await findRelevantDocuments(lastUserMessage);
          
          if (relevantDocs.length === 0) {
            responseText = "I don't have any specific information about that medication in my database. Please consult your healthcare provider for medical advice.";
            return;
          }

          // Create context from relevant documents
          const context = relevantDocs
            .map(doc => {
              // Extract structured information from the document
              const content = doc.content;
              const title = doc.title;
              const metadata = doc.metadata as Record<string, string>;
              
              // Create a structured summary of the drug information
              const drugInfo = [
                `Drug: ${title}`,
                metadata.genericName ? `Generic/Proper Name: ${metadata.genericName}` : null,
                metadata.activeIngredients ? `Active Ingredients: ${metadata.activeIngredients}` : null,
                metadata.pharmacologicClass ? `Pharmacologic Class: ${metadata.pharmacologicClass}` : null,
                metadata.company ? `Manufacturer: ${metadata.company}` : null,
                metadata.labelType ? `Label Type: ${metadata.labelType}` : null,
                metadata.dosageForm ? `Dosage Form: ${metadata.dosageForm}` : null,
                metadata.routeOfAdministration ? `Route of Administration: ${metadata.routeOfAdministration}` : null,
                `Content: ${content}`
              ].filter(Boolean).join('\n');

              return drugInfo;
            })
            .join('\n\n');

          // Create a more descriptive prompt for drug information
          const prompt = `
You are a medical information assistant specializing in FDA-approved medications. Based on the provided FDA drug label information, give a structured response to the user's query.

IMPORTANT GUIDELINES:
1. Only include sections for which you have specific information from the provided context
2. If a section has no information, omit it entirely
3. For drug recommendations:
   - Only recommend drugs that are explicitly mentioned in the context
   - Only include OTC (over-the-counter) and prescription drugs
   - Exclude any unapproved or investigational drugs
   - Do not show duplicate drugs (same active ingredient and dosage form)
   - Do not confuse drug names with condition names
   - Compare drugs based on their actual pharmacologic classes and indications
   - If no drugs match the query criteria, clearly state that
4. Always verify drug names against the provided context
5. If the query is about a specific drug, only provide information about that drug if it exists in the context
6. For the manufacturer section:
   - Only include if the manufacturer information is available
   - If manufacturer is not available, omit the entire section
7. If no relevant drugs are found in the provided context:
   - Inform the user that no drugs were found in the FDA database
   - Provide general information about the condition or drug class from your knowledge
   - Clearly state that this information is not from FDA-approved labels
   - Recommend consulting healthcare providers for specific treatment options
8. Drug filtering:
   - Only show FDA-approved OTC and prescription drugs
   - Exclude any unapproved or investigational drugs
   - If multiple versions of the same drug exist, show only the most common or relevant one
   - Group similar drugs by active ingredient to avoid redundancy
9. Data presentation:
   - Only include fields that have actual data
   - Do not show fields with "Not specified" or "N/A"
   - If a section has no valid information, omit it entirely
   - Keep the response clean and concise

Format your response as follows (only include sections with available information):

For each unique drug, number them sequentially (1, 2, 3, etc.):

1. DRUG INFORMATION:
• Name: [Drug name]
[Only include the following fields if they have actual data:]
• Generic/Proper Name: [Generic name]
• Active Ingredients: [List of active ingredients]
• Pharmacologic Class: [Pharmacologic class]
• Label Type: [Label type]
• Dosage Form: [Dosage form]
• Route of Administration: [Route of administration]

2. USAGE AND INDICATIONS:
• [Key points about usage and indications]

3. IMPORTANT WARNINGS:
• [Important warnings and precautions]

4. MANUFACTURER:
• [Manufacturer name]

[If no drugs found in database]
GENERAL INFORMATION:
• [Provide general information about the condition or drug class]
• [Include common treatment approaches]
• [Mention important considerations]

Note: This information is not from FDA-approved labels. Please consult healthcare providers for specific treatment options.

Context from FDA drug labels:
${context}

User Query: ${lastUserMessage}

Remember to:
1. Use bullet points (•) for all items
2. Keep information clear and concise
3. Only include information from the provided context
4. Always remind users to consult healthcare providers
5. Format exactly as shown above with the section headers in CAPS
6. Put each section on a new line
7. Put each bullet point on a new line
8. For drug recommendations, provide multiple relevant options if available
9. For each recommended drug, provide its complete information in the format shown above
10. If no drugs match the query criteria, clearly state that
11. Do not make assumptions about drugs not mentioned in the context
12. Do not confuse drug names with condition names
13. Only include the manufacturer section if you have valid manufacturer information
14. Number each drug's information section sequentially
15. Include all available drug information fields
16. If no drugs found, provide general information with appropriate disclaimers
17. Only show FDA-approved OTC and prescription drugs
18. Exclude unapproved or investigational drugs
19. Avoid showing duplicate drugs
20. Group similar drugs by active ingredient
21. Do not show fields with "Not specified" or "N/A"
22. Omit sections that have no valid information
`;

          console.log('Generating response...');
          const result = await retryWithBackoff(() => model.generateContent(prompt));
          const response = await result.response;
          responseText = formatResponse(response.text());

          // Additional cleanup for manufacturer section
          responseText = responseText
            .replace(/MANUFACTURER:\n•\s*Not specified\n?/g, '') // Remove manufacturer section if it only contains "Not specified"
            .replace(/MANUFACTURER:\n•\s*\n?/g, '') // Remove empty manufacturer section
            .replace(/\n{3,}/g, '\n\n'); // Clean up any resulting multiple newlines
        } else {
          // For general queries, use regular conversation
          const prompt = `
You are a helpful AI assistant. Provide a concise and friendly response to the user's query.

User Query: ${lastUserMessage}

Keep your response brief and to the point. If the query is unclear, ask for clarification.
`;

          const result = await retryWithBackoff(() => model.generateContent(prompt));
          const response = await result.response;
          responseText = formatResponse(response.text());
        }
      } catch (error) {
        console.error('Error in model initialization:', error);
        throw error;
      }
    };

    // Initialize the model and get the response
    await initializeModel();

    return NextResponse.json({ content: responseText });
  } catch (error) {
    console.error('Detailed error in chat route:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your configuration.' },
          { status: 401 }
        );
      }
      if (error.message.includes('503')) {
        return NextResponse.json(
          { error: 'The service is temporarily unavailable. Please try again in a few moments.' },
          { status: 503 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get chat completion' },
      { status: 500 }
    );
  }
} 