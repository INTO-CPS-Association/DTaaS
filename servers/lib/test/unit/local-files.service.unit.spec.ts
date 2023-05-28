import { Test, TestingModule } from "@nestjs/testing";
import { LocalFilesService } from "../../src/files/services/local-files.service";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import path, { join } from "path";
import {
  MockConfigService,
  pathToTestDirectory,
  pathToTestFileContent,
  testDirectory,
  testFileArray,
  testFileContent,
} from "../testUtil";
import e from "express";
import { InternalServerErrorException } from "@nestjs/common";

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
    // Mock readdirSync to return array of filenames
    const mockFilenames = [
      "Test-Data",
      "Test-Digital Twins",
      "Test-Functions",
      "Test-Models",
      "Test-Tools",
    ];
    jest.spyOn(fs, "readdirSync").mockReturnValue(mockFilenames as any);

    // Simplified mock for lstatSync
    const statsMock = {
      isDirectory: jest.fn().mockReturnValue(true),
    };
    jest
      .spyOn(fs, "lstatSync")
      .mockReturnValue(statsMock as unknown as fs.Stats);

    mockConfigService.get("LOCAL_PATH");

    const result = await service.listDirectory(pathToTestDirectory);
    expect(testDirectory).toEqual(result);
  });

  it("should read file", async () => {
    const testPath = "test-path";
    const testDataPath = "test-data-path";
    const testFullPath = join(testDataPath, testPath);
    const testName = testPath.split("/").pop();
    const testContent = "test-content";

    const responseMock = {
      repository: {
        blobs: {
          nodes: [
            {
              name: testName,
              rawBlob: testContent,
              rawTextBlob: testContent,
            },
          ],
        },
      },
    };

    mockConfigService.get = jest.fn().mockReturnValue(testDataPath);
    jest.spyOn(fs, "readFileSync").mockReturnValue(testContent as any);

    const result = await service.readFile(testPath);

    expect(mockConfigService.get).toHaveBeenCalledWith("LOCAL_PATH");
    expect(fs.readFileSync).toHaveBeenCalledWith(testFullPath, "utf8");
    expect(result).toEqual(responseMock);
  });

  it("should throw InternalServerErrorException when read file error", async () => {
    const testPath = "test-path";
    const testDataPath = "test-data-path";

    mockConfigService.get = jest.fn().mockReturnValue(testDataPath);
    jest.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error();
    });

    await expect(service.readFile(testPath)).rejects.toThrow(
      InternalServerErrorException
    );
  });
});
