export type ContactStatus = "unread" | "read";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
};

export const CONTACT_COLLECTION = "contact_messages";

export function isContactStatus(value: unknown): value is ContactStatus {
  return value === "unread" || value === "read";
}
