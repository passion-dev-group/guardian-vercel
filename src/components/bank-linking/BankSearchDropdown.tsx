
import { useState, useEffect } from "react";
import { Search, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackEvent } from "@/lib/analytics";

// Sample bank data - in a real app this would come from an API
const BANKS = [
  { id: "chase", name: "Chase", logo: "chase.svg" },
  { id: "bofa", name: "Bank of America", logo: "bofa.svg" },
  { id: "wells", name: "Wells Fargo", logo: "wells.svg" },
  { id: "citi", name: "Citibank", logo: "citi.svg" },
  { id: "capital", name: "Capital One", logo: "capital.svg" },
  { id: "usbank", name: "US Bank", logo: "usbank.svg" },
  { id: "pnc", name: "PNC Bank", logo: "pnc.svg" },
  { id: "tdbank", name: "TD Bank", logo: "tdbank.svg" },
];

interface BankSearchDropdownProps {
  onSelectBank: (bankId: string) => void;
  onSelectCardTab: () => void;
}

const BankSearchDropdown = ({ onSelectBank, onSelectCardTab }: BankSearchDropdownProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredBanks, setFilteredBanks] = useState(BANKS);

  useEffect(() => {
    const filtered = BANKS.filter(bank => 
      bank.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBanks(filtered);
  }, [searchTerm]);

  const handleSelectBank = (bankId: string) => {
    trackEvent('bank_selected', { bank_id: bankId });
    onSelectBank(bankId);
  };

  return (
    <Tabs defaultValue="banks" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="banks">Bank Account</TabsTrigger>
        <TabsTrigger value="card" onClick={onSelectCardTab}>Credit/Debit Card</TabsTrigger>
      </TabsList>
      
      <TabsContent value="banks" className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for your bank..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search for your bank"
          />
        </div>
        
        <div className="max-h-64 overflow-y-auto border rounded-md">
          {filteredBanks.length > 0 ? (
            <ul className="divide-y">
              {filteredBanks.map(bank => (
                <li key={bank.id}>
                  <button
                    onClick={() => handleSelectBank(bank.id)}
                    className="w-full text-left p-3 flex items-center hover:bg-muted transition-colors"
                    aria-label={`Select ${bank.name}`}
                  >
                    <div className="w-8 h-8 mr-3 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center">
                      {/* In a real app, we'd load actual logos */}
                      <span className="text-xs font-bold">{bank.name.substring(0, 2)}</span>
                    </div>
                    <span>{bank.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No banks found matching "{searchTerm}"
            </div>
          )}
        </div>
      </TabsContent>
      
      <TabsContent value="card">
        {/* Card tab content is handled by parent component */}
      </TabsContent>
    </Tabs>
  );
};

export default BankSearchDropdown;
