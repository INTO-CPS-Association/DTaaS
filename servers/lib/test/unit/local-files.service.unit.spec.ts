import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { LocalFilesService } from "../../src/files/services/local-files.service";
import * as fs from "fs";
import { join } from "path";
import { pathToTestDirectory, testFileArray } from "../testUtil";

jest.mock("fs", () => ({
  promises: {
    readdir: jest.fn(),
    lstat: jest.fn(),
    readFile: jest.fn(),
  },
}));

describe("LocalFilesService", () => {
  let service: LocalFilesService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalFilesService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("mocked_path") },
        },
      ],
    }).compile();

    service = module.get<LocalFilesService>(LocalFilesService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should list directory", async () => {
    const fullPath = join(configService.get("LOCAL_PATH"), pathToTestDirectory);

    const direntMock = testFileArray.map((file) => ({
      name: file,
      isDirectory: () => true,
    }));

    // Mock Stats value for lstat
    const statsMock: Partial<fs.Stats> = {
      isDirectory: () => true, // change this to false when you need a file instead of a directory
    };

    jest.spyOn(fs.promises, "readdir").mockResolvedValue(testFileArray as any);

    jest
      .spyOn(fs.promises, "lstat")
      .mockImplementation((pathToTestDirectory) => {
        if (typeof pathToTestDirectory === "string") {
          return Promise.resolve(statsMock as fs.Stats);
        }
        throw new Error(`Invalid argument: ${pathToTestDirectory}`);
      });
    const result = await service.listDirectory(pathToTestDirectory);
    expect(result).toEqual({
      repository: {
        tree: {
          trees: {
            edges: testFileArray.map((file) => ({
              node: { name: file, type: "tree" },
            })),
          },
          blobs: { edges: [] },
        },
      },
    });
    expect(fs.promises.readdir).toHaveBeenCalledWith(fullPath);
    expect(fs.promises.lstat).toHaveBeenCalledTimes(testFileArray.length);
  });

  it("should read file", async () => {
    const path = "test_path/test_file";
    const content = "test content";
    const name = "test_file";
    const fullPath = join(configService.get("LOCAL_PATH"), path);

    jest.spyOn(fs.promises, "readFile").mockResolvedValue(content);

    const result = await service.readFile(path);
    expect(result).toEqual({
      repository: {
        blobs: { nodes: [{ name, rawBlob: content, rawTextBlob: content }] },
      },
    });
    expect(fs.promises.readFile).toHaveBeenCalledWith(fullPath, "utf8");
  });
});
