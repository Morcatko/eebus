import * as ws from 'ws';
import * as fs from 'fs';
import * as EEBUS from './EEBUS.types';
import { untransformObject } from './utils/json-transformer';
import { logIn } from './utils/log';

const CMI_HEAD = 0x00;

export interface IEEBUSClient {
  sendMessage(messageType: EEBUS.MessageType, message: Buffer): Promise<void>;
  receiveMessage(): Promise<Buffer>;
  on_message(handler: (data: Buffer) => void): void
}

export class EEBUSClient implements IEEBUSClient {
  private ws: ws.WebSocket | null = null;

  constructor(
    private readonly targetIp: string,
    private readonly port: number,
    private readonly pfxCertPath: string
  ) { }

  public async connect() {
    const pfx = fs.readFileSync(this.pfxCertPath);

    // In a real EEBUS impl, you must use a TLS certificate and verify the remote SKI
    this.ws = new ws.WebSocket(`wss://${this.targetIp}:${this.port}`, "ship", {
      pfx: pfx,
      passphrase: '',
      rejectUnauthorized: false, // For local dev/testing only!
    });

    //this.ws.addEventListener('message', (data: ws.MessageEvent) => this.handleMessage(data));

    return new Promise<void>((resolve, reject) => {
      this.ws!.addEventListener('open', () => {
        console.log('Connection opened.');
        resolve();
      })
    });
  }

  public async sendMessage(messageType: EEBUS.MessageType, message: Buffer) {
    if (!this.ws || this.ws.readyState !== ws.OPEN) {
      throw new Error('WebSocket is not open');
    }

    const prefix = Buffer.from([messageType]);
    const fullMessage = Buffer.concat([prefix, message]);
    this.ws.send(fullMessage);
  }

  private sendMessage_Buffer(messageType: EEBUS.MessageType, message: Buffer) {
    const prefix = Buffer.from([messageType]);
    const fullMessage = Buffer.concat([prefix, message]);
    console.log("=>>", fullMessage);
    this.sendMessage(messageType, message);
  }

  public async receiveMessage(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const onMessage = (data: ws.MessageEvent) => {
        this.ws!.off('error', onError);
        resolve(data as unknown as Buffer);
      };

      const onError = (err: Error) => {
        this.ws!.off('message', onMessage);
        reject(err);
      };

      this.ws!.once('message', onMessage);
      this.ws!.once('error', onError);

    });
  }

  private async ReceiveMessage_Buffer(): Promise<Buffer> {
    const rawData = await this.receiveMessage();
    console.log("<<=", rawData);
    return rawData;
  }


  public async init() {
    this.sendMessage_Buffer(EEBUS.MessageType.INIT, Buffer.from([CMI_HEAD]));
    const msg = await this.ReceiveMessage_Buffer();
    if (msg[0] !== EEBUS.MessageType.INIT || msg[1] !== CMI_HEAD) {
      throw new Error('Unexpected response to INIT message');
    }
  }

  public on_message(handler: (data: Buffer) => void) {
    this.ws!.on('message', handler);
  }
}

export const receiveJson = async <T>(eebus: IEEBUSClient) => {
  const rawData = await eebus.receiveMessage();
  const zeroByte = rawData[0] as EEBUS.MessageType;
  const jsonString = rawData.slice(1).toString();
  const message: T = untransformObject(JSON.parse(jsonString));

  const result = { zeroByte, message };
  logIn(zeroByte, JSON.stringify(result.message));
  return result;
}