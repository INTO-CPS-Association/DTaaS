import { BackendInterface } from 'model/interfaces/backendInterfaces';

export interface Asset {
  name: string;
  path: string;
  type: string;
  isPrivate: boolean;
  backendInstance?: BackendInterface;
  fullDescription?: string;
}
