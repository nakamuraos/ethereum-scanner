/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import config from './config';
import { setDefaultResultOrder } from 'node:dns';
import {
  generateWallet,
  logToFile,
  telegramSendMessage,
  toOrdinalNumber,
} from './utils';

setDefaultResultOrder('ipv6first');

@Injectable()
export class AppService {
  private isRunning = false;
  private providers: { [key: string]: JsonRpcBatchProvider } = {};
  private chooseRPCs: { [key: string]: number } = {};
  private count = 0;

  constructor() {
    Object.keys(config.listRPC).map((k) => this.switchRPC(k));
    void this.cron();
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

  async cron() {
    if (this.isRunning) return;
    this.isRunning = true;
    const now = new Date().toISOString();

    // Notify
    if (this.count % config.telegram.notifyWhen === 0) {
      await telegramSendMessage(
        `\`[${config.telegram.chatId}] Tick-tock: ${this.count}\``,
      );
      console.log('===============================================');
      console.log(
        `>>> ${this.count === 0 ? 'First' : toOrdinalNumber(this.count)}`,
        'notifications sent',
        now,
      );
      console.log('===============================================');
    }

    // Log
    this.count++;
    console.log('===============================================');
    console.log(`>>> ${toOrdinalNumber(this.count)} attempt`, now);
    console.log('===============================================');

    // Generate wallets
    const wallets = Array(config.parallel.count)
      .fill(0)
      .map(() => generateWallet());

    // Get balances
    const balances = await this.getBalancesBatch(wallets.map((e) => e.address));
    console.log(balances);

    // Filter wallets with balance
    const foundAddresses = Object.keys(balances).filter(
      (e) => Object.values(balances[e]).reduce((a, b) => a + b, 0) > 0,
    );

    // Log to file
    logToFile(
      wallets
        .map((wallet) =>
          [
            now,
            wallet.address,
            wallet.privateKey,
            wallet.mnemonic,
            ...Object.keys(balances[wallet.address]).map(
              (k) => `${balances[wallet.address][k]} ${k.toUpperCase()}`,
            ),
          ].join(),
        )
        .join('\n'),
      'all',
    );

    // Notify
    if (foundAddresses.length > 0) {
      const mappingAddresses = foundAddresses.map((address) => ({
        balances: balances[address],
        ...wallets.find((e) => e.address === address),
      }));
      logToFile(
        mappingAddresses
          .map((e) =>
            [
              now,
              e.address,
              e.privateKey,
              e.mnemonic,
              ...Object.keys(e.balances).map(
                (k) => `${e.balances[k]} ${k.toUpperCase()}`,
              ),
            ].join(),
          )
          .join('\n'),
        'found',
      );
      await telegramSendMessage(
        '```\n' + JSON.stringify(mappingAddresses, null, 2) + '```',
      );
      console.log('===============================================');
      console.log(`>>> Found ${foundAddresses.length} wallet(s)`, now);
      console.log(mappingAddresses);
      console.log('===============================================');
    }

    // Done
    this.isRunning = false;
    void this.cron();
  }
}
