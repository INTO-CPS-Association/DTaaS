import { Command, CommandRunner, Option } from 'nest-commander';
import { readFileSync} from 'fs';
import { parse } from 'dotenv';

@Command({
    name: 'libms'
})

export default class LibmsCommand extends CommandRunner {
    async run(_inputs: string[], options: Record<string, string>): Promise<void> 
    {
        const configFile = this.parseConfigFile(options.config);
        const config = readFileSync(configFile);
        parse(config);
    }
    @Option({
        flags: '-c, --config <config-file>',
        description: 'Configuration file',
    })
    parseConfigFile(this: LibmsCommand, configFile: string): string {
        return configFile;
    }
}