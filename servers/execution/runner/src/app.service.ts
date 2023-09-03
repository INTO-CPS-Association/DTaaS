import { Injectable } from '@nestjs/common';

@Injectable()
export default class AppService {
  private name: string = "Hello World!"
  
  getHello(): string {
    return this.name;
  }
}
