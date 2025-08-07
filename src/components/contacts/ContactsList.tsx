
import React from 'react';
import { Contact } from '@/hooks/useContacts';
import { ContactCard } from './ContactCard';

interface ContactsListProps {
  title: string;
  contacts: Contact[];
  onToggleSelect: (contactId: string) => void;
  emptyMessage?: string;
}

export const ContactsList: React.FC<ContactsListProps> = ({ 
  title, 
  contacts, 
  onToggleSelect,
  emptyMessage = "No contacts found" 
}) => {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {contacts.length > 0 ? (
        <ul className="space-y-2">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground py-4 text-center">{emptyMessage}</p>
      )}
    </section>
  );
};
