export type RoleId = 'owner' | 'cashier' | 'inventory';

export type StaffRoleLabel = 'Owner' | 'Manager' | 'Cashier' | 'Stockkeeper' | 'Online orders';

export type LanguageId = 'en' | 'roman' | 'ur';

export type ShopKitId =
  | 'clothing'
  | 'shoes'
  | 'jewellery'
  | 'pharmacy'
  | 'grocery'
  | 'cosmetics'
  | 'mobile'
  | 'other';

export interface UserProfile {
  id: string;
  name: string;
  shortName: string;
  role: RoleId;
  roleLabel: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  pin?: string;
}

export interface BranchInfo {
  id: string;
  name: string;
  city: string;
  phone: string;
  address: string;
  isMain: boolean;
}

export interface AuthSession {
  isAuthenticated: boolean;
  isDeviceSetup: boolean;
  counterSignedIn: boolean;
  user: UserProfile;
  shopName: string;
  kit: ShopKitId;
  branchId: string;
  branches: BranchInfo[];
  language: LanguageId;
}
