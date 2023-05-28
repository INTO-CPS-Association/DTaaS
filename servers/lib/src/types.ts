import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class Blob {
  @Field()
  name: string;

  @Field()
  type: string;
}

@ObjectType()
export class BlobEdge {
  @Field(() => Blob)
  node: Blob;
}

@ObjectType()
export class BlobConnection {
  @Field(() => [BlobEdge])
  edges: BlobEdge[];
}

@ObjectType()
export class TreeEntry {
  @Field()
  name: string;

  @Field()
  type: string;
}

@ObjectType()
export class TreeEdge {
  @Field(() => TreeEntry)
  node: TreeEntry;
}

@ObjectType()
export class TreeConnection {
  @Field(() => [TreeEdge])
  edges: TreeEdge[];
}

@ObjectType()
export class Tree {
  @Field()
  blobs: BlobConnection;

  @Field()
  trees: TreeConnection;
}

@ObjectType()
export class RepositoryBlob {
  @Field()
  name: string;

  @Field()
  rawBlob: string;

  @Field()
  rawTextBlob: string;
}
@ObjectType()
export class RepositoryBlobConnection {
  @Field(() => [RepositoryBlob])
  nodes: RepositoryBlob[];
}

@ObjectType()
export class Repository {
  @Field()
  tree?: Tree;

  @Field()
  blobs?: RepositoryBlobConnection;
}
@ObjectType()
export class Project {
  @Field(() => Repository)
  repository: Repository;
}

@ObjectType()
export class Query {
  @Field()
  listDirectory: Project;

  @Field()
  readFile: Project;
}
