/**
 * Safely parse a fetch response as JSON, handling HTML error pages and other edge cases
 */
export async function parseJsonResponse(response: Response): Promise<unknown> {
  const responseText = await response.text();
  
  // Check if response is empty
  if (!responseText || responseText.trim() === '') {
    if (response.ok) {
      return {}; // Return empty object for successful empty responses
    }
    throw new Error(`HTTP ${response.status}: Empty response`);
  }
  
  // Check if response is HTML (error page)
  if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
    throw new Error(`Server error: ${response.status} ${response.statusText}`);
  }
  
  // Try to parse as JSON
  try {
    return JSON.parse(responseText);
  } catch {
    // If it's not valid JSON, throw a descriptive error
    const preview = responseText.substring(0, 100);
    throw new Error(`Invalid JSON response: ${preview}${responseText.length > 100 ? '...' : ''}`);
  }
}

/**
 * Handle error responses safely, extracting meaningful error messages
 */
export async function handleErrorResponse(response: Response): Promise<never> {
  let errorMessage = `HTTP ${response.status}`;
  
  try {
    const data = await parseJsonResponse(response) as { error?: string; message?: string };
    errorMessage = data.error || data.message || errorMessage;
  } catch (parseError) {
    // If we can't parse the error response, use the parse error message
    if (parseError instanceof Error) {
      errorMessage = parseError.message;
    }
  }
  
  throw new Error(errorMessage);
}

/**
 * Fetch with automatic JSON parsing and error handling
 */
export async function fetchJson(url: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    await handleErrorResponse(response);
  }
  
  return parseJsonResponse(response);
}