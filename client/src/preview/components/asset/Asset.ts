import GitlabInstance from "preview/util/gitlab";

export interface Asset {
  name: string;
  path: string;
  type: string;
  isPrivate: boolean;
  gitlabInstance?: GitlabInstance;
  fullDescription?: string;
}
