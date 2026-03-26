import { type IEEBUSClient, receiveJson } from "./EEBUS.client";
import * as SHIP from "./SHIP.types";
import * as EEBUS from "./EEBUS.types";
import { transformObject } from "./utils/json-transformer";
import { logOut } from "./utils/log";

export class SHIPClient {
	constructor(
		private readonly eebus: IEEBUSClient,
		private readonly device_id: string,
	) {
	}

	private sendMessage(messageType: EEBUS.MessageType, message: object) {
		const messageString = JSON.stringify(transformObject(message)[0]);
		const payload = Buffer.from(messageString);
		this.eebus.sendMessage(messageType, payload);

		logOut(messageType, JSON.stringify(message));
	}

	private async receiveMessage<T>(): Promise<{ zeroByte: EEBUS.MessageType; message: T }> {
		return receiveJson<T>(this.eebus);
	}

	private async hello() {
		const helloMessage: SHIP.Hello = {
			"connectionHello": {
				"phase": "ready",
				"waiting": 60000,
			},
		};

		this.sendMessage(EEBUS.MessageType.CONTROL, helloMessage);
		const response = await this.receiveMessage<SHIP.Hello>();
		if (response.zeroByte !== EEBUS.MessageType.CONTROL) {
			throw new Error("Unexpected response to HELLO message");
		}
		const phase = (response.message as any).connectionHello?.phase;
		if (phase !== "ready") {
			throw new Error(`Unexpected phase in HELLO response: ${phase}`);
		}
	}

	private async handshake() {
		const handshakeMessage: SHIP.Handshake = {
			"messageProtocolHandshake": {
				"handshakeType": "announceMax",
				"version": {
					"major": 1,
					"minor": 0,
				},
				"formats": { "format": [SHIP.format_JSON_UTF8] },
			},
		};
		this.sendMessage(EEBUS.MessageType.CONTROL, handshakeMessage);
		const response = await this.receiveMessage<SHIP.Handshake>();
		if (response.zeroByte !== EEBUS.MessageType.CONTROL) {
			throw new Error("Unexpected response to HANDSHAKE message");
		}
		if (
			(response.message.messageProtocolHandshake.version.major !== 1) ||
			(response.message.messageProtocolHandshake.version.minor !== 0)
		) {
			throw new Error("Unexpected version in HANDSHAKE response");
		}

		if (response.message.messageProtocolHandshake.formats.format[0] !== SHIP.format_JSON_UTF8) {
			throw new Error("Unexpected format in HANDSHAKE response");
		}

		this.sendMessage(EEBUS.MessageType.CONTROL, response.message);
	}

	private async PIN() {
		//For some reason server sends it without request
		const pin = await this.receiveMessage();

		//Client does not require pin
		const noPin = { "connectionPinState": { "pinState": "none" } };
		this.sendMessage(EEBUS.MessageType.CONTROL, noPin);
	}

	private async accessMethods() {
		const out_amr: SHIP.AccessMethodsRequest = { "accessMethodsRequest": {} };
		this.sendMessage(EEBUS.MessageType.CONTROL, out_amr);
		await this.receiveMessage<object>();

		//server requests access methods;
		const in_amr = await this.receiveMessage<object>();
		const in_amr_response: SHIP.AccessMethodsResponse = {
			"accessMethods": {
				"id": this.device_id, //It seems this can be anything
				"dnsSd_mDns": [], //No idea what it it
			},
		};
		this.sendMessage(EEBUS.MessageType.CONTROL, in_amr_response);
	}

	public async init() {
		await this.hello();
		await this.handshake();
		await this.PIN();
		await this.accessMethods();
	}
}
