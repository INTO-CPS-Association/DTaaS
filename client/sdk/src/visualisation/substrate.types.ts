import type { z } from 'zod';
import type { substrateDescriptorSchema } from '../schema/substrate.schema';
import type { HostServices } from '../host/hostServices.types';
import type { Anchor, AnchorKind } from './anchor.types';
import type { ResolvedEncoding } from './encoding.types';

export type SubstrateDescriptor = z.infer<typeof substrateDescriptorSchema>;

/** An addressable element on a mounted substrate. */
export interface ElementRef {
  readonly substrate: string;
  readonly id: string;
  /** Adapter-private handle, e.g. a three.js object or a Konva node. */
  readonly handle?: unknown;
}

export interface FrameOptions {
  readonly padding?: number;
  readonly animate?: boolean;
}

/** Layer 5: the seam that makes photographs, video and 3D peers (R1). */
export interface SubstrateAdapter {
  readonly id: string;
  readonly supports: readonly AnchorKind[];
  mount(container: HTMLElement, descriptor: SubstrateDescriptor): Promise<void>;
  resolve(anchor: Anchor): ElementRef | null;
  /** Hot path; must be O(1) per call (R6). */
  apply(ref: ElementRef, encoding: ResolvedEncoding): void;
  frame(ref: ElementRef, options?: FrameOptions): void;
  pick(x: number, y: number): ElementRef | null;
  /** Media seek or animation time, in epoch milliseconds. */
  setTime(t: number): void;
  dispose(): void;
}

export type SubstrateAdapterFactory = (host: HostServices) => SubstrateAdapter;
