import { Injectable } from '@nestjs/common';

@Injectable()
export default class AppService {
  private echo: string = 'Hello World!';

  getHello(): string {
    return this.echo;
  }
}
