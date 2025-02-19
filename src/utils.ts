import { Mnemonic, randomBytes, Wallet } from 'ethers';
import config from './config';
import * as fs from 'fs';
import * as path from 'path';

export const generateWallet = () => {
  const wallet = Wallet.fromPhrase(
    Mnemonic.entropyToPhrase(randomBytes(config.generate.mnemonic.randomBytes)),
  );
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic!.phrase,
  };
};

export function toOrdinalNumber(num) {
  const mod100 = num % 100;
  const mod10 = num % 10;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${num}th`;
  }

  switch (mod10) {
    case 1:
      return `${num}st`;
    case 2:
      return `${num}nd`;
    case 3:
      return `${num}rd`;
    default:
      return `${num}th`;
  }
}

export const telegramSendMessage = async (text: string, timeout = 10000) => {
  const controller = new AbortController();
  const signal = controller.signal;
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`,
      {
        signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.telegram.chatId,
          text,
          parse_mode: 'MarkdownV2',
        }),
      },
    );
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (error.name === 'AbortError') {
      throw new Error('Fetch request timed out');
    }
    throw error;
  }
};

export const isFileEmpty = (filePath: string): boolean => {
  if (!fs.existsSync(filePath)) return true; // File doesn't exist → Treat as empty

  const stats = fs.statSync(filePath);
  return stats.size === 0; // Check file size
};

export const logToFile = (content: string, type: 'all' | 'found') => {
  if (!config.logging.enable && type !== 'found') return;
  const filePath = path.join(__dirname, config.logging[type]);
  const dirPath = path.dirname(filePath);

  // Ensure directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Ensure file exists
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'Time,Address,PrivateKey,Mnemonic,Balance\n'); // Create empty file
  } else if (isFileEmpty(filePath)) {
    // Empty file → Add header
    fs.appendFileSync(filePath, 'Time,Address,PrivateKey,Mnemonic,Balance\n');
  }

  // Append log content
  fs.appendFileSync(filePath, `${content}\n`);
};
