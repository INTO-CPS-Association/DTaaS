import { BackendInterface } from 'model/backend/gitlab/gitlab';

export interface Asset {
  name: string;
  path: string;
  type: string;
  isPrivate: boolean;
  gitlabInstance?: BackendInterface;
  fullDescription?: string;
}
