import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { Node } from "../graphql";
// import * as fs from "fs";

@Injectable()
export class NodeService {
  async getNode(path: string): Promise<Node> {
    try {
      // const content = await (
      //   await fs.promises.readFile("", "utf8")
      // ).trim();
      console.log("patth", path);

      // const name = path.split("/").pop(); // extract file name from the path
    } catch (error) {
      throw new InternalServerErrorException("Error reading file");
    }
    return { name: "nameee", type: "typeee", path: "pathhhh" };
  }
}
