import { BackendInterface } from 'model/backend/gitlab/interfaces';

export interface Asset {
  name: string;
  path: string;
  type: string;
  isPrivate: boolean;
  gitlabInstance?: BackendInterface;
  fullDescription?: string;
}
