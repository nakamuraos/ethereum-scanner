/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import config from './config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mnemonic, randomBytes, Wallet } from 'ethers';
import { setDefaultResultOrder } from 'node:dns';

setDefaultResultOrder('ipv6first');

@Injectable()
export class AppService {
  private isRunning = false;
  private providers: { [key: string]: JsonRpcBatchProvider } = {};
  private chooseRPCs: { [key: string]: number } = {};
  private count = 0;

  constructor() {
    Object.keys(config.listRPC).map((k) => this.switchRPC(k));
  }

  switchRPC(network: string) {
    const rpcs = config.listRPC;
    this.chooseRPCs[network] = (this.chooseRPCs[network] || 0) + 1;
    let rpc: string;
    if (rpcs[network][this.chooseRPCs[network]]) {
      rpc = rpcs[network][this.chooseRPCs[network]];
    } else {
      rpc = rpcs[network][0];
      this.chooseRPCs[network] = 0;
    }
    console.log(network.toUpperCase(), 'Switch RPC', rpc);
    this.providers[network] = new JsonRpcBatchProvider(rpc);
  }

  async getBalancesBatch(
    addresses: string[],
  ): Promise<{ [address: string]: { [key: string]: number } }> {
    const results: { [address: string]: { [key: string]: number } } = {};
    await Promise.all(
      Object.keys(this.providers).map(async (network) => {
        const balancePromises = addresses.map((address) =>
          this.providers[network]
            .getBalance(address)
            .catch(() => this.switchRPC(network)),
        );
        const balances = await Promise.all(balancePromises);
        for (const [index, address] of addresses.entries()) {
          if (!results[address])
            results[address] = Object.assign(
              {},
              ...Object.keys(this.providers).map((e) => ({ [e]: 0 })),
            );
          results[address][network] = +(balances[index] || 0);
        }
      }),
    );
    return results;
  }

  async telegramSendMessage(text: string) {
    await fetch(
      `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.telegram.chatId,
          text,
          parse_mode: 'MarkdownV2',
        }),
      },
    );
  }

  generateWallet() {
    const wallet = Wallet.fromPhrase(Mnemonic.entropyToPhrase(randomBytes(16)));
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic!.phrase,
    };
  }

  @Cron(CronExpression.EVERY_SECOND)
  async cron() {
    if (this.isRunning) return;
    this.isRunning = true;
    if (this.count % config.telegram.notifyWhen === 0) {
      await this.telegramSendMessage(
        `\`[${config.telegram.chatId}] Tick-tock: ${this.count}\``,
      );
    }
    this.count++;
    console.log('=======================================');
    console.log(`>>> Attempted ${this.count}`);
    console.log('=======================================');
    const wallets = Array(config.parallel.count)
      .fill(0)
      .map(() => this.generateWallet());
    const balances = await this.getBalancesBatch(wallets.map((e) => e.address));
    console.log(balances);
    const foundAddresses = Object.keys(balances).filter(
      (e) => Object.values(balances[e]).reduce((a, b) => a + b, 0) > 0,
    );
    if (foundAddresses.length > 0) {
      const mappingAddresses = foundAddresses.map((address) => ({
        balances: balances[address],
        ...wallets.find((e) => e.address === address),
      }));
      await this.telegramSendMessage(
        '```\n' + JSON.stringify(mappingAddresses, null, 2) + '```',
      );
    }
    this.isRunning = false;
  }
}
