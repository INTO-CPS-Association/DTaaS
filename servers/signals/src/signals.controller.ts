import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';

export type PlaceholderAnswer = {
  status: 'not-implemented';
  route: 'stream' | 'range';
};

// The stream and range routes keep their final paths and methods, so the
// client and the deployment can be wired before the API pull request fills
// them in. Until then they answer 501.
@Controller('signals')
export default class SignalsController {
  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Post('stream')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  stream(): PlaceholderAnswer {
    return { status: 'not-implemented', route: 'stream' };
  }

  @Post('range')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  range(): PlaceholderAnswer {
    return { status: 'not-implemented', route: 'range' };
  }
}
