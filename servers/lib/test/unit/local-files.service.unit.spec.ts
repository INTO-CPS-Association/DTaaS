import { Test, TestingModule } from "@nestjs/testing";
import { LocalFilesService } from "../../src/files/services/local-files.service";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";

import {
  MockConfigService,
  pathToTestDirectory,
  pathToTestFileContent,
  testDirectory,
  testFileContent,
} from "../testUtil";

jest.mock("fs");

describe("LocalFilesService", () => {
  let service: LocalFilesService;
  const mockConfigService = new MockConfigService();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalFilesService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    service = module.get<LocalFilesService>(LocalFilesService);
  });

  it("should list directory", async () => {
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue(testDirectory as unknown as fs.Dirent[]);
    jest.spyOn(mockConfigService, "get").mockReturnValue(pathToTestDirectory);

    const result = await service.listDirectory(pathToTestDirectory);

    expect(testDirectory).toEqual(result);
  });

  it("should read file", async () => {
    jest
      .spyOn(fs, "readFileSync")
      .mockReturnValue(testFileContent as unknown as Buffer);

    const result = await service.readFile(pathToTestFileContent);
    expect(result[0]).toEqual(testFileContent);
  });
});
