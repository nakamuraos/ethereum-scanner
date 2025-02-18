/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as config from 'config';
import { isNil } from 'lodash';

class Config {
  get nodeEnv(): string {
    return this.getString('node_env');
  }

  get server() {
    return {
      host: this.getString('server.host'),
      port: this.getNumber('server.port'),
    };
  }

  get isDevelopment() {
    return this.nodeEnv === 'development';
  }

  get telegram() {
    return {
      botToken: this.getString('telegram.botToken'),
      chatId: this.getString('telegram.chatId'),
      notifyWhen: this.getNumber('telegram.notifyWhen'),
    };
  }

  get parallel() {
    return { count: this.getNumber('parallel.count') };
  }

  get listRPC() {
    return this.getObject('rpcs');
  }

  private getString(key: string): string {
    const value = (config as config.IConfig).get<string>(key);
    if (isNil(value)) {
      throw new Error(key + ' environment variable does not set');
    }

    return value.toString().replace(/\\n/g, '\n');
  }

  private getObject<T = string>(key: string): T[] {
    const value = config.get<T[]>(key);
    return value;
  }

  private getArray<T = string>(key: string): T[] {
    const value = config.get<T[]>(key);
    if (!Array.isArray(value)) {
      throw new Error(key + ' environment variable is not array');
    }
    return value;
  }

  private getNumber(key: string): number {
    const value = this.getString(key);
    try {
      return Number(value);
    } catch {
      throw new Error(key + ' environment variable is not a number');
    }
  }

  private getBoolean(key: string): boolean {
    const value = this.getString(key);
    try {
      return Boolean(JSON.parse(value));
    } catch {
      throw new Error(key + ' env var is not a boolean');
    }
  }
}

export default new Config();
