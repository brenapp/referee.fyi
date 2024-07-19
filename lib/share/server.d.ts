export type ShareInstance = {
  sku: string;
  admins: string[];
  invitations: string[];
  secret: string;
};

export type Invitation = {
  id: string;
  sku: string;
  instance_secret: string;
  user: string;
  from: string;
  admin: boolean;
  accepted: boolean;
};
