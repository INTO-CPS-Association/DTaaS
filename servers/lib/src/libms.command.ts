import { Command, CommandRunner, Option } from 'nest-commander';
import { readFileSync} from 'fs';
import { parse } from 'dotenv';

@Command({
    name: 'libms'
})

export default class LibmsCommand extends CommandRunner {
    private configFile: string;

    async run(_inputs: string[], options: Record<string, string>): Promise<void> 
    {
        if (options.config) {
            this.parseConfigFile(options.config);
        }
        const config = readFileSync(this.configFile);
        parse(config);
    }
    @Option({
        flags: '-c, --config <config-file>',
        description: 'Configuration file',
    })
    parseConfigFile(configFile: string): void {
        this.configFile = configFile;
    }
}