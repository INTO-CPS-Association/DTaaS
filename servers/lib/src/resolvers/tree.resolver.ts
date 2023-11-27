import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { join } from "path";
import * as fs from "fs";

@Resolver("Tree")
export class TreeResolver {
  @ResolveField()
  async blobs(@Parent() tree) {
    const edges = await Promise.all(
      tree.tree.map((file) => TreeResolver.getFileStats(tree.dataPath, file)),
    );

    return edges.filter((edge) => edge.type === "blob");
  }

  @ResolveField()
  async trees(@Parent() tree) {
    const edges = await Promise.all(
      tree.tree.map((file) => TreeResolver.getFileStats(tree.dataPath, file)),
    );

    return edges.filter((edge) => edge.type === "tree");
  }

  private static async getFileStats(fullPath: string, file: string) {
    const stats = await fs.promises.lstat(join(fullPath, file));
    if (stats.isDirectory()) {
      return { name: file, type: "tree", path: file };
    }
    return { name: file, type: "blob", path: file };
  }
}
