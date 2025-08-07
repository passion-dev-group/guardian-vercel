
import React from 'react';
import { Contact } from '@/hooks/useContacts';
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ContactCardProps {
  contact: Contact;
  onToggleSelect: (contactId: string) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact, onToggleSelect }) => {
  const { id, name, email, phone, selected } = contact;
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleSelect(id as string);
    }
  };
  
  return (
    <li className="flex items-center space-x-3 p-3 border rounded-md bg-card">
      <Checkbox
        id={`contact-${id}`}
        checked={selected}
        onCheckedChange={() => onToggleSelect(id as string)}
        aria-label={`Select ${name}`}
      />
      <Avatar className="h-10 w-10">
        <AvatarFallback>
          {name ? name.charAt(0).toUpperCase() : '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{name || 'Unknown'}</div>
        <div className="text-sm text-muted-foreground truncate">
          {email || phone || 'No contact info'}
        </div>
      </div>
    </li>
  );
};
