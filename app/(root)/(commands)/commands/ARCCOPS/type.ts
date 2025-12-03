
export interface DivisionMember {
  id: string;
  name: string;
  rank: string;
  bio: string;
  imageUrl?: string;
  discordId?: string;
  joinDate?: string;
  specializations?: string[];
}

export interface ARCCOPSResponse {
  command: DivisionMember[];
  members: DivisionMember[];
}
