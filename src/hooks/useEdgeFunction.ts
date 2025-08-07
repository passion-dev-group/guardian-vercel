
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type EdgeFunctionOptions = {
  functionName: string;
  body?: Record<string, any>;
  headers?: Record<string, string>;
};

export function useEdgeFunction<T>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const callFunction = async ({ functionName, body, headers }: EdgeFunctionOptions): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers
      });
      
      if (error) {
        throw new Error(error.message || 'Function call failed');
      }
      
      setData(data);
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error(`Error calling ${functionName}:`, error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { callFunction, data, isLoading, error };
}
