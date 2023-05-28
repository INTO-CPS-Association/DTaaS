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
  @Field((type) => Blob)
  node: Blob;
}

@ObjectType()
export class BlobConnection {
  @Field((type) => [BlobEdge])
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
  @Field((type) => TreeEntry)
  node: TreeEntry;
}

@ObjectType()
export class TreeConnection {
  @Field((type) => [TreeEdge])
  edges: TreeEdge[];
}

@ObjectType()
export class Tree {
  @Field((type) => BlobConnection)
  blobs: BlobConnection;

  @Field((type) => TreeConnection)
  trees: TreeConnection;
}

@ObjectType()
export class Repository {
  @Field((type) => Tree)
  tree: Tree;
}

@ObjectType()
export class RepositoryBlob {
  @Field()
  name: String;

  @Field()
  rawBlob: String;

  @Field()
  rawTextBlob: String;
}
@ObjectType()
export class RepositoryBlobConnection {
  @Field(() => [RepositoryBlob])
  nodes: RepositoryBlob[];
}

@ObjectType()
export class Project {
  @Field((type) => Repository)
  repository: Repository;
}

@ObjectType()
export class Query {
  @Field()
  listDirectory: Project;

  @Field()
  readFile: Project;
}
