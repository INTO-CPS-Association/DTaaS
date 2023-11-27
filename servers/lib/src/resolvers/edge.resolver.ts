import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
// import * as fs from "fs";
// import { NodeService } from "../services/node.service";

@Resolver("Edge")
export class EdgeResolver {
  // constructor(private nodeService: NodeService) {}
  @ResolveField()
  async node(@Parent() edge) {
    console.log("edge", edge);
    // const files = await fs.promises.readdir(edge);
    return edge;
    // return files.map(() => this.nodeService.getNode("testpath"));
  }
}
