import { Injectable } from "@nestjs/common";
import { FilesService } from "../interfaces/files.service";

@Injectable()
export class LocalFilesService implements FilesService {
  // Implement listDirectory and readFile methods here...
}
