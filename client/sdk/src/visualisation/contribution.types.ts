import type { ComponentType, LazyExoticComponent } from 'react';
import type { z } from 'zod';
import type { encodingPresetSchema } from '../schema/preset.schema';
import type { HostServices } from '../host/hostServices.types';
import type { Anchor, AnchorKind } from './anchor.types';
import type { DigitalTwinSummary } from './digitalTwin.types';
import type {
  ElementRef,
  SubstrateAdapter,
  SubstrateAdapterFactory,
} from './substrate.types';

/** A code-split module; calling it is what pulls in heavy code. */
export type LazyModule<T> = () => Promise<{ default: T }>;

/** A domain anchor kind and how to find its element on a substrate. */
export interface AnchorKindSpec {
  readonly kind: AnchorKind;
  /** Substrate ids this kind can be resolved on. */
  readonly substrates: readonly string[];
  readonly label?: string;
  validateRef?(ref: string): boolean;
  resolve(anchor: Anchor, adapter: SubstrateAdapter): ElementRef | null;
}

export interface ConverterInput {
  readonly name: string;
  readonly bytes: Uint8Array;
}

export interface ConverterOutput {
  readonly format: string;
  readonly bytes: Uint8Array;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type Converter = (
  input: ConverterInput,
  host: HostServices,
) => Promise<ConverterOutput>;

/** Converts a domain asset format for a substrate, e.g. IFC → fragments. */
export interface ConverterSpec {
  readonly id: string;
  /** File extensions this converter accepts, e.g. `['.ifc']`. */
  readonly from: readonly string[];
  readonly to: string;
  readonly load: LazyModule<Converter>;
}

/** A named, domain-typed bundle of encodings a user can pick. */
export type EncodingPreset = z.infer<typeof encodingPresetSchema>;

export interface ScopeContext {
  readonly adapter: SubstrateAdapter;
}

/** Groups elements for a preset, e.g. per room or floor via the IFC tree. */
export interface ScopeRule {
  readonly id: string;
  readonly label: string;
  group(
    elementIds: readonly string[],
    context: ScopeContext,
  ): Record<string, string[]>;
}

export interface FieldSample {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
  readonly value: number;
}

export interface FieldGrid {
  readonly width: number;
  readonly height: number;
}

/** Interpolates point samples onto a grid for the `fieldOverlay` encoding. */
export type FieldKernel = (
  samples: readonly FieldSample[],
  grid: FieldGrid,
) => Float32Array;

export interface FieldKernelSpec {
  readonly id: string;
  readonly label?: string;
  readonly load: LazyModule<FieldKernel>;
}

/** A substrate no standard adapter covers, e.g. a P&ID schematic. */
export interface LazySubstrateAdapterSpec {
  readonly id: string;
  readonly supports: readonly AnchorKind[];
  readonly load: LazyModule<SubstrateAdapterFactory>;
}

export interface InspectorPanelProps {
  readonly selection: ElementRef;
}

/** The domain-specific parts of the six layers. Everything else is common. */
export interface DomainContribution {
  /** Which twins this domain claims. */
  detect(dt: DigitalTwinSummary): boolean | Promise<boolean>;
  readonly anchorKinds?: readonly AnchorKindSpec[];
  readonly converters?: readonly ConverterSpec[];
  readonly presets?: readonly EncodingPreset[];
  readonly scopes?: readonly ScopeRule[];
  readonly fieldKernels?: readonly FieldKernelSpec[];
  readonly substrates?: readonly LazySubstrateAdapterSpec[];
  readonly inspectorPanel?: LazyExoticComponent<
    ComponentType<InspectorPanelProps>
  >;
}
