/** Fill a template such as '{owner}' with the twin's owner. */
export default function fillTemplate(template: string, owner: string): string {
  return template.replaceAll('{owner}', owner);
}
