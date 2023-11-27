import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Blob")
export class BlobResolver {
  @ResolveField()
  async edges(@Parent() blob) {
    return blob;
  }
  @ResolveField()
  async nodes(@Parent() blob) {
    return blob;
  }
}
