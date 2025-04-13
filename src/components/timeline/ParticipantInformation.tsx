import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, User, Briefcase } from "lucide-react";

interface Vendor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  type?: {
    id: number;
    name: string;
  } | null;
}

interface ParticipantInformationProps {
  timelineId: number;
}

export function ParticipantInformation({ timelineId }: ParticipantInformationProps) {
  const [participants, setParticipants] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchParticipants();
  }, [timelineId]);

  const fetchParticipants = async () => {
    if (!timelineId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/timelines/${timelineId}/vendors`);
      if (!response.ok) {
        throw new Error('Failed to fetch timeline participants');
      }
      
      const data = await response.json();
      console.log('Fetched timeline participants:', data);
      
      // Process the data to ensure we have the right format
      const processedParticipants = Array.isArray(data) 
        ? data.map(item => {
            if (item.vendor) {
              return {
                id: item.vendor.id,
                name: item.vendor.name || 'Unnamed Vendor',
                email: item.vendor.email,
                phone: item.vendor.phone,
                address: item.vendor.address,
                notes: item.vendor.notes,
                type: item.vendor.type
              };
            }
            return {
              ...item,
              name: item.name || 'Unnamed Vendor'
            };
          })
        : [];
      
      setParticipants(processedParticipants);
    } catch (error) {
      console.error('Error fetching timeline participants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch timeline participants",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : participants.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No participants assigned to this timeline yet.</p>
          <p className="text-sm mt-2">
            Add participants in the "Participants" section to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {participants.map((participant) => (
            <Card key={participant.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{participant.name}</h3>
                    {participant.type && (
                      <div className="flex items-center text-muted-foreground text-sm">
                        <Briefcase className="h-3.5 w-3.5 mr-1" />
                        {participant.type.name}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 mt-2 flex-1">
                  {participant.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-3.5 w-3.5 mr-2 text-purple-600" />
                      <a href={`mailto:${participant.email}`} className="text-purple-600 hover:underline">
                        {participant.email}
                      </a>
                    </div>
                  )}
                  
                  {participant.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-3.5 w-3.5 mr-2 text-purple-600" />
                      <a href={`tel:${participant.phone}`} className="text-purple-600 hover:underline">
                        {participant.phone}
                      </a>
                    </div>
                  )}
                  
                  {participant.address && (
                    <div className="flex items-start text-sm">
                      <MapPin className="h-3.5 w-3.5 mr-2 text-purple-600 mt-0.5" />
                      <span>{participant.address}</span>
                    </div>
                  )}
                </div>
                
                {participant.notes && (
                  <div className="mt-3 pt-3 border-t text-sm">
                    <p className="text-muted-foreground">{participant.notes}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 