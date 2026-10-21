export type DigitalTwinSummary = {
  name: string;
  description: string;
};

export type DigitalTwinDetails = DigitalTwinSummary & {
  fullDescription: string;
  descriptionFiles: string[];
  configFiles: string[];
  lifecycleFiles: string[];
};
