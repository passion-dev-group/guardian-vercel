
import { type ClassValue, clsx } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function hashString(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  console.log("data", window.crypto);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function getCurrentIpAddress(): Promise<string> {
  const response = await fetch('https://api.ipify.org?format=json');
  const data = await response.json();
  return data.ip;
}

export function formatDateRelative(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // Invalid date
  if (isNaN(targetDate.getTime())) {
    return 'Invalid date';
  }
  
  const diffInDays = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Tomorrow';
  } else if (diffInDays > 1 && diffInDays < 7) {
    return `In ${diffInDays} days`;
  } else if (diffInDays >= 7 && diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `In ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  } else if (diffInDays >= 30) {
    const months = Math.floor(diffInDays / 30);
    return `In ${months} ${months === 1 ? 'month' : 'months'}`;
  } else if (diffInDays === -1) {
    return 'Yesterday';
  } else if (diffInDays < 0) {
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(targetDate);
  }
  
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(targetDate);
}
export const copyToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // Use a more modern approach for the fallback
      const successful = document.queryCommandSupported('copy');
      if (successful) {
        document.execCommand('copy');
        toast.success("Copied to clipboard");
      } else {
        toast.error("Copy not supported");
      }
      
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    toast.error("Failed to copy");
  }
};

// Add this SQL function to your database:
// CREATE OR REPLACE FUNCTION get_circle_balance(circle_id_param UUID)
// RETURNS NUMERIC
// LANGUAGE plpgsql
// AS $$
// DECLARE
//   circle_balance NUMERIC;
// BEGIN
//   SELECT 
//     COALESCE(SUM(
//       CASE 
//         WHEN type = 'contribution' AND status = 'completed' THEN amount
//         WHEN type = 'payout' AND status = 'completed' THEN -amount
//         ELSE 0
//       END
//     ), 0) INTO circle_balance
//   FROM circle_transactions
//   WHERE circle_id = circle_id_param;
//   
//   RETURN circle_balance;
// END;
// $$;
