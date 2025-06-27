import { BackendInterface } from 'model/backend/gitlab/UtilityInterfaces';

export interface Asset {
  name: string;
  path: string;
  type: string;
  isPrivate: boolean;
  backendInstance?: BackendInterface;
  fullDescription?: string;
}
