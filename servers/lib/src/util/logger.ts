import { Injectable, Logger } from '@nestjs/common'; // =added To Follow The NestJS pattern=
import { IConsoleLogger } from "./Interfaces/IConsoleLogger";
import { ColorUtility } from "./ColorUtility.js";
//=removed=
//Ensure the ConsoleLogger class is properly set up as a NestJS service.
const LINE_LENGTH: number = 50 as const;
const INDENT_SPACES: string = "              " as const; //14 spaces

@Injectable()
export class ConsoleLogger extends Logger implements IConsoleLogger {
    constructor() {
        super();
    }

    ErrorMsg(message: string, maxLineLength: number = LINE_LENGTH): void {
        this.printWrappedMessage(message, maxLineLength, ColorUtility.FG_RED, "∙X∙ ERR ∙X∙:");
    }
    WarningMsg(message: string, maxLineLength: number = LINE_LENGTH): void {
        this.printWrappedMessage(message, maxLineLength, ColorUtility.FG_YELLOW, "/// WRN ///:");
    }
    LogMsg(message: string, maxLineLength: number = LINE_LENGTH): void {
        this.printWrappedMessage(message, maxLineLength, ColorUtility.FG_BLUE, "██▀ MSG ▄█▐:");
    }

    private printWrappedMessage(
        message: string,
        maxLineLength: number,
        ColorChar: string,
        MSG_SYMBOLD: string,
    ): void {
        const words = message.split(" ");
        let currentLine = "";
        let output = ColorChar + MSG_SYMBOLD + " ";

        for (const word of words) {
            if ((currentLine + word).length > maxLineLength) {
                output += ColorChar + currentLine.trim() + "\n" + ColorUtility.RESET + INDENT_SPACES + ColorChar;
                currentLine = word + " ";
            } else {
                currentLine += word + " ";
            }
        }
        // Append any remaining text.
        output += currentLine.trim();

        console.log(output);
        console.log(ColorUtility.RESET);
    }
}