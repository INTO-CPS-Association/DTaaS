export class ColorUtility {
    // Static color constants
    static readonly RESET: string = "\x1b[0m" as const;
    static readonly BG_BLACK: string = "\x1b[40m" as const;
    static readonly BG_RED: string = "\x1b[41m" as const;
    static readonly BG_GREEN: string = "\x1b[42m" as const;
    static readonly BG_YELLOW: string = "\x1b[43m" as const;
    static readonly BG_BLUE: string = "\x1b[44m" as const;
    static readonly BG_MAGENTA: string = "\x1b[45m" as const;
    static readonly BG_CYAN: string = "\x1b[46m" as const;
    static readonly BG_WHITE: string = "\x1b[47m" as const;

    static readonly FG_BLACK: string = "\x1b[30m" as const;
    static readonly FG_RED: string = "\x1b[31m" as const;
    static readonly FG_GREEN: string = "\x1b[32m" as const;
    static readonly FG_YELLOW: string = "\x1b[33m" as const;
    static readonly FG_BLUE: string = "\x1b[34m" as const;
    static readonly FG_MAGENTA: string = "\x1b[35m" as const;
    static readonly FG_CYAN: string = "\x1b[36m" as const;
    static readonly FG_WHITE: string = "\x1b[37m" as const;

}