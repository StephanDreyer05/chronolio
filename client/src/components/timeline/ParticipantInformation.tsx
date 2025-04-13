import React, { useState, useEffect } from 'react';
import { Card } from "../ui/card";
import { VendorSelector } from './VendorSelector';
import { fetchWithAuth } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, User, Briefcase, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";

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
  };
  vendor?: Vendor; // For nested structure in API responses
}

interface ParticipantInformationProps {
  timelineId: number;
}

export function ParticipantInformation({ timelineId }: ParticipantInformationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch assigned vendors
  const { data: assignedVendors, isLoading: vendorsLoading, error: vendorsError } = useQuery({
    queryKey: [`/api/timelines/${timelineId}/vendors`],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(`/api/timelines/${timelineId}/vendors`);
        if (!response.ok) {
          if (response.status === 404) {
            // If 404, return empty array since there might not be any vendors yet
            return [];
          }
          const errorText = await response.text();
          console.error(`Error loading timeline vendors: ${response.status} ${errorText}`);
          throw new Error(`Failed to load timeline vendors: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process the data to ensure we have the right format
        const processedParticipants = Array.isArray(data) 
          ? data.map((item: any) => {
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
        
        return processedParticipants;
      } catch (error) {
        console.error('Error fetching timeline vendors:', error);
        throw error;
      }
    },
    retry: (failureCount: number, error: any) => {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  if (vendorsLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (vendorsError) {
    return (
      <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-md text-amber-800 dark:text-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Error loading participants</span>
        </div>
        <p className="text-sm mb-3">The system encountered an error while loading timeline participants.</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/timelines/${timelineId}/vendors`] })}
          className="text-xs"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      {!assignedVendors || assignedVendors.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No participants assigned to this timeline yet.</p>
          <VendorSelector
            timelineId={timelineId}
            isTimelineVendor={true}
            buttonLabel="Add Participants"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignedVendors.map((participant: Vendor) => (
            <Card key={participant.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{participant.name}</h3>
                  {participant.type && (
                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                      {participant.type.name}
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 flex-grow">
                  {participant.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2 text-purple-500" />
                      <a 
                        href={`mailto:${participant.email}`} 
                        className="hover:underline hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        {participant.email}
                      </a>
                    </div>
                  )}
                  
                  {participant.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2 text-purple-500" />
                      <a 
                        href={`tel:${participant.phone}`} 
                        className="hover:underline hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        {participant.phone}
                      </a>
                    </div>
                  )}
                  
                  {participant.address && (
                    <div className="flex items-start text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 text-purple-500 flex-shrink-0" />
                      <span>{participant.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      <div className="mt-6 flex justify-center">
        <VendorSelector 
          timelineId={timelineId}
          isTimelineVendor={true}
          buttonLabel="Manage Participants"
        />
      </div>
    </div>
  );
} 