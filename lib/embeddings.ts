import { GoogleGenerativeAI } from '@google/generative-ai';
import { Document } from '../models/Document';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'embedding-001' });
  const result = await model.embedContent(text);
  const embedding = result.embedding;
  if (!embedding || !embedding.values || !Array.isArray(embedding.values)) {
    throw new Error('Invalid embedding response');
  }
  return embedding.values;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

interface DocumentWithSimilarity {
  _id: string;
  title: string;
  content: string;
  embedding: number[];
  metadata: Record<string, string>;
  similarity: number;
}

export async function findRelevantDocuments(query: string, limit: number = 3): Promise<DocumentWithSimilarity[]> {
  const queryEmbedding = await generateEmbedding(query);
  
  // Get all documents and calculate similarity
  const documents = await Document.find({});
  const documentsWithSimilarity = documents.map((doc: any) => ({
    ...doc.toObject(),
    similarity: cosineSimilarity(queryEmbedding, doc.embedding)
  }));

  // Sort by similarity and return top matches
  return documentsWithSimilarity
    .sort((a: DocumentWithSimilarity, b: DocumentWithSimilarity) => b.similarity - a.similarity)
    .slice(0, limit);
} 