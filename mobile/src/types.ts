export type User = {
  id: string;
  name: string;
  email: string;
  verified: boolean;
};
export type Campus = {
  id: string;
  name: string;
  domain: string;
  website: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  status: "pending" | "active" | "suspended";
  role: "student" | "staff" | "owner";
  created_at?: string;
  join_code?: string;
  emergency_phone?: string;
  support_email?: string;
};
export type Report = {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  latitude: number;
  longitude: number;
  status: string;
  public_summary: string | null;
  staff_note: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};
export type DirectoryContact = {
  id: string;
  name: string;
  phone: string;
  description: string;
  priority: number;
};
export type TrustedContact = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  other_id: string;
  other_name: string;
  other_email: string;
};
export type SharingSession = {
  id: string;
  owner_id: string;
  owner_name?: string;
  expires_at: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  updated_at: string | null;
  recipients?: string[];
};
export type Sharing = { mine: SharingSession[]; incoming: SharingSession[] };
export type CampusAlert = {
  id: string;
  title: string;
  body: string;
  expires_at: string;
  created_at: string;
};
export type Member = { id: string; name: string; email: string; role: string };
export type Audit = {
  id: string;
  action: string;
  actor_name: string | null;
  details?: {
    title?: string;
    changes?: Record<string, { from: string | null; to: string | null }>;
  };
  target_id?: string;
  operator_name?: string | null;
  review_note?: string | null;
  created_at: string;
};
export type MapPin = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  subtitle?: string;
  color?: string;
};
