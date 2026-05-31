export interface MessageContext {
  lead: {
    fullName: string;
    languagePref: 'en' | 'hi' | 'hinglish';
    locationCity?: string;
    objections?: string[];
    callSummary?: string;
  };
  project: {
    name: string;
    location: string;
    unitType: string;
    priceRange: string;
    keyAmenities: string;
    brochureUrl?: string;
    segment: string;
    siteAddress?: string;
    possessionDate?: string;
    availableUnits?: string;
    videoUrl?: string;
  };
  client: {
    brandName: string;
  };
  sequenceStep: number;
}

export interface GeneratedMessage {
  subject?: string;
  body: string;
  suggestedSendTimeIST?: string;
}
