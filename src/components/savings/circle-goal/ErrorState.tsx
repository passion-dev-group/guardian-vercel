
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function ErrorState() {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h2 className="text-xl font-semibold mb-2">Goal Not Found</h2>
      <p className="text-muted-foreground mb-4">The goal you're looking for doesn't exist or you don't have access to it.</p>
      <Button onClick={() => navigate('/savings-goals')}>Back to Goals</Button>
    </div>
  );
}
