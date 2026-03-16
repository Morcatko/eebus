import { IEEBUSClient } from "./EEBUS.client";
import * as EEBUS from './EEBUS.types';
import * as SPINE from './SPINE.types';
import { transformObject, untransformObject } from './utils/json-transformer';
import { logIn, logOut } from "./utils/log";

const featureAddressToString = (address: SPINE.FeatureAddress) => address.entity.join(".") + "-" + address.feature;

export class SPINEClient {
    private readonly readReplyMap: Map<number, (response: SPINE.Message) => void> = new Map();
    private readonly callResultMap: Map<number, (response: SPINE.Message) => void> = new Map();
    private readonly subscriptionCallbacksMap: Map<string, (response: SPINE.Message) => void> = new Map();

    constructor(private readonly eebus: IEEBUSClient) {
    }

    private msgCounter = 1;

    private logOut(messageString: string, datagram: SPINE.Datagram, logHeader?: string) {
        const header = datagram.header;
        const msgId = header.msgCounterReference ? `${header.msgCounter}/${header.msgCounterReference}` : `${header.msgCounter}`;
        const log = `${header.cmdClassifier}(${msgId}) ${logHeader ? "-" : ""} ${logHeader ?? ""}`
        logOut(EEBUS.MessageType.DATA, messageString, log);
    }

    private logIn(message: SPINE.Message, logHeader?: string) {
        const header = message.data.payload.datagram.header;
        const cmdClassifier = header.cmdClassifier;
        const msgId = header.msgCounterReference ? `${header.msgCounter}/${header.msgCounterReference}` : `${header.msgCounter}`;
        const log = `${cmdClassifier}(${msgId}) ${logHeader ? "-" : ""} ${logHeader ?? ""}`
        const messageString = JSON.stringify(message);
        logIn(EEBUS.MessageType.DATA, messageString, log);
    }

    private sendMessage(datagram: SPINE.Datagram, extra?: {
        logHeader?: string
    }) {
        //Cannot use SPINE.Message as the json transformation is somehow different
        const message = {
            "data": [{
                "header": [{
                    "protocolId": "ee1.0"
                }]
            },
            {
                "payload": {
                    "datagram": transformObject(datagram) as any as SPINE.Datagram
                }
            }]
        };

        const messageString = JSON.stringify(message);
        const payload = Buffer.from(messageString);
        this.logOut(messageString, datagram, extra?.logHeader);
        this.eebus.sendMessage(EEBUS.MessageType.DATA, payload);
    }

    private sendPayload(
        cmdClassifier: SPINE.Datagram["header"]["cmdClassifier"],
        entity: number[],
        feature: number,
        payload: SPINE.Payload,
        extra?: {
            logHeader?: string
            msgCounterReference?: number
        }
    ) {
        const msgCounter = this.msgCounter++;

        const ackRequest = (cmdClassifier !== "reply") && (cmdClassifier !== "result");

        const datagram: SPINE.Datagram = {
            "header": {
                "specificationVersion": "1.3.0",
                "addressSource": {
                    "entity": [0],
                    "feature": 0
                },
                "addressDestination": {
                    "entity": entity,
                    "feature": feature
                },
                "msgCounter": msgCounter,
                ...(extra?.msgCounterReference ? { "msgCounterReference": extra.msgCounterReference } : {}),
                "cmdClassifier": cmdClassifier,
                ...(ackRequest ? { "ackRequest": ackRequest } : {})
            },
            "payload": {
                "cmd": [payload]
            }
        };
        this.sendMessage(datagram, {
            logHeader: extra?.logHeader
        });
        return msgCounter;
    }

    public async sendWriteCmd(
        entity: number[],
        feature: number,
        payload: SPINE.Payload) {
            const msgId = this.sendPayload("write", entity, feature, payload);

            //Set some timeout
        return new Promise<any>((resolve, reject) => {
            this.readReplyMap.set(msgId, (response) => {
                resolve(response.data.payload.datagram.payload.cmd[0]);
            });
        });
        }

    private async sendReadCmd<TResponse>(
        entity: number[],
        feature: number,
        payload: SPINE.Payload) {
        const msgId = this.sendPayload("read", entity, feature, payload);

        //Set some timeout
        return new Promise<TResponse>((resolve, reject) => {
            this.readReplyMap.set(msgId, (response) => {
                resolve(response.data.payload.datagram.payload.cmd[0] as TResponse);
            });
        });
    }

    public async readFunction<TResponse>(entity: number[], feature: number, readFunction: string) {
        const _payload = {
            [readFunction]: []
        };

        return await this.sendReadCmd<TResponse>(entity, feature, _payload as any as SPINE.Payload);
    }

    private async sendCallCmd(entity: number[], feature: number, payload: SPINE.Payload) {
        const msgId = this.sendPayload("call", [0], 0, payload);

        //Set some timeout
        return new Promise<SPINE.Datagram<SPINE.ResultData>>((resolve, reject) => {
            this.callResultMap.set(msgId, (response) => {
                resolve(response.data.payload.datagram as SPINE.Datagram<SPINE.ResultData>);
            });
        });
    }

    public async subscribe<TPayload = SPINE.Payload>(entity: number[], feature: number, onMessage: (payload: TPayload) => void) {
        const payload = {
            "nodeManagementSubscriptionRequestCall": {
                "subscriptionRequest": {
                    "clientAddress": {
                        "entity": [0],
                        "feature": 0
                    },
                    "serverAddress": {
                        "entity": entity,
                        "feature": feature
                    }
                }
            }
        };

        const result = await this.sendCallCmd([0], 0, payload);
        const resultData = (result.payload.cmd[0] as SPINE.ResultData).resultData;

        if (resultData.errorNumber !== 0) {
            console.log("Subscription failed", entity, feature);
            throw new Error("Subscription failed");
        }
        console.log("Subscription succeeded", entity, feature)

        const key = featureAddressToString({ entity, feature });
        this.subscriptionCallbacksMap.set(key, (response) => onMessage(response.data.payload.datagram.payload.cmd[0] as TPayload));
        return () => {
            // delete subscription from remote device
            this.subscriptionCallbacksMap.delete(key);
        };
    }


    private sendConfirm(request: SPINE.Message) {
        const payload: SPINE.Payload =
        {
            "resultData": {
                "errorNumber": 0
            }
        }

        this.sendPayload("result", [0], 0, payload, {
            msgCounterReference: request.data.payload.datagram.header.msgCounter,
            logHeader: "Handled subscription call request"
        });
    }

    private handle_nodeManagementDetailedDiscoveryData(request: SPINE.Message) {
        const payload: SPINE.NodeManagementDetailedDiscoveryData = {
            "nodeManagementDetailedDiscoveryData": {
                "specificationVersionList": {
                    "specificationVersion": [
                        "1.3.0"
                    ]
                },
                "deviceInformation": {
                    "description": {
                        "deviceAddress": {
                            "device": "d:_i:123458LKSJNDFLKNL"
                        },
                        "deviceType": "ElectricitySupplySystem",
                        "networkFeatureSet": "smart"
                    }
                },
                "entityInformation": [
                    {
                        "description": {
                            "entityAddress": {
                                "entity": [0]
                            },
                            "entityType": "DeviceInformation"
                        }
                    }
                ],
                "featureInformation": [{
                    "description": {
                        "featureAddress": {
                            "entity": [0],
                            "feature": 0
                        },
                        "featureType": "NodeManagement",
                        "role": "special",
                        "supportedFunction": [/*
                            {
                                "function": "nodeManagementSubscriptionData",
                                "possibleOperations": {
                                    "read": []
                                }
                            }, {
                                "function": "nodeManagementSubscriptionRequestCall",
                                "possibleOperations": []
                            }, {
                                "function": "nodeManagementSubscriptionDeleteCall",
                                "possibleOperations": []
                            }, {
                                "function": "nodeManagementBindingDeleteCall",
                                "possibleOperations": []
                            }
                       */ ],
                    }
                }]
            }
        };

        this.sendPayload("reply", [0], 0, payload, {
            msgCounterReference: request.data.payload.datagram.header.msgCounter,
            logHeader: "Handled nodeManagementDetailedDiscoveryData read request"
        });
    }

    private messageHandler(data: Buffer) {
        const zeroByte = data[0] as EEBUS.MessageType;
        const jsonString = data.slice(1).toString();
        const message = untransformObject(JSON.parse(jsonString)) as SPINE.Message

        //const message = JSON.parse(jsonString) as SPINE.Message

        if (zeroByte !== EEBUS.MessageType.DATA) {
            console.error("Unexpected message type", zeroByte);
            return;
        }

        const datagram = message.data.payload.datagram;

        if (datagram.header.cmdClassifier === "reply") {
            const callback = this.readReplyMap.get(datagram.header.msgCounterReference);
            if (callback) {
                this.logIn(message, "reply (to read)");
                this.readReplyMap.delete(datagram.header.msgCounterReference);
                callback(message);
                return;
            }
        }
        if (datagram.header.cmdClassifier === "result") {
            const callback = this.callResultMap.get(datagram.header.msgCounterReference);
            if (callback) {
                this.logIn(message, "result (to call)");
                this.callResultMap.delete(datagram.header.msgCounterReference);
                callback(message);
                return;
            }
        }

        if (datagram.header.cmdClassifier === "notify") {
            const callback = this.subscriptionCallbacksMap.get(featureAddressToString(datagram.header.addressSource));
            if (callback) {
                this.logIn(message, "Subscription notify");
                callback(message);
                return;
            }
        }


        const cmd = datagram.payload.cmd[0];
        if ((datagram.header.cmdClassifier === "call")
            && ((cmd as SPINE.NodeManagementSubscriptionRequestCall).nodeManagementSubscriptionRequestCall !== undefined)) {
            this.logIn(message, "Subscription request");
            this.sendConfirm(message);
            return;
        }

        if ((datagram.header.cmdClassifier === "read")
            && ((cmd as SPINE.NodeManagementDetailedDiscoveryData).nodeManagementDetailedDiscoveryData !== undefined)) {
            this.logIn(message, "DetailedDiscovery request");
            this.handle_nodeManagementDetailedDiscoveryData(message);
            return;
        }

        this.logIn(message, "!!! Unhandled !!!");
    }

    public init() {
        this.eebus.on_message((d) => this.messageHandler(d));
    }
}
