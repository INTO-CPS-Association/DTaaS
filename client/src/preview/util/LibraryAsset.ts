class LibraryAsset {
  public assetName: string;

  public path: string;

  public isPrivate: boolean;

  public type: string;

  public fullDescription: string;

  constructor(
    assetName: string,
    path: string,
    isPrivate: boolean,
    type: string,
  ) {
    this.assetName = assetName;
    this.path = path;
    this.isPrivate = isPrivate;
    this.type = type;
    this.fullDescription = '';
  }

  // TODO: implement this method
  async getFullDescription(): Promise<void> {
    this.fullDescription = 'This is a description';
  }
}

export default LibraryAsset;
