/**
 * Where the `aec` substrate reads a building model from, and the name it
 * shows a sensor by. Kept apart from the scene so it is tested without WebGL.
 */

/**
 * The library address of the converted model a visualisation names.
 *
 * A `lib://` or web address is used as it is. A bare file name is a model of
 * the shared models folder, the folder the Buildings page lists. An IFC name
 * means the GLB the Buildings page stores beside it, since the core draws
 * converted geometry and leaves converting to the domain kit.
 */
export function modelAddress(source: string, modelsDirectory: string): string {
  const named = /^(lib:\/\/|https?:\/\/)/.test(source)
    ? source
    : `lib://${modelsDirectory}/${modelName(source)}`;
  return named.toLowerCase().endsWith('.ifc')
    ? `${named.slice(0, -'.ifc'.length)}.glb`
    : named;
}

/** A bare model name, refused when it could leave the models folder. */
function modelName(source: string): string {
  if (!source || /[/\\\0?#%]/.test(source) || source.startsWith('.')) {
    throw new Error(`${source} is not a model name in the models folder`);
  }
  return source;
}

/** The name a sensor is shown with: its label, or else its signal path. */
export function sensorName(signalPath: string, label?: string): string {
  return label || signalPath;
}
