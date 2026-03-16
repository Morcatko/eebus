export type Message = {
    "data": {
        "header": {
            "protocolId": "ee1.0",
        },
        "payload": {
            "datagram": Datagram
        }
    }
};

type EntityAddress = {
    "entity": number[]
};

type EntityType = "DeviceInformation" | "CEM" | "HeatPumpAppliance" | "Compresos" | "DHWCircuit" | "HeatingCircuit" | "HeatingZone" | "HVACRoom" | "TemperatureSensor";

export type FeatureAddress = EntityAddress & {
    "feature": number
};

type DatagramAddress = {
    device?: string
} & FeatureAddress;


export type Datagram<TPayload = Payload> = {
    "header": {
        "specificationVersion": "1.3.0",
        "addressSource": DatagramAddress,
        "addressDestination": DatagramAddress,
        "msgCounter": number,
        "msgCounterReference"?: number,
        "cmdClassifier": "read" | "reply" | "call" | "result" | "notify" | "write",
        "ackRequest"?: boolean
    },
    "payload": {
        "cmd": [
            TPayload
        ]
    }
}

export type Payload =
    ResultData
    | NodeManagementDetailedDiscoveryData
    | NodeManagementSubscriptionRequestCall
    | DeviceClassificationManufacturerData
    | DeviceClassificationUserData
    | MeasurementListData
    | SetPointListData;
    ;

export type TValue = {
    "number": number,
    "scale"?: number
};

export type ResultData = {
    "resultData": {
        "errorNumber": number
    }
}

export type NodeManagementSubscriptionRequestCall = {
    "nodeManagementSubscriptionRequestCall": {}
}

// #region NodeManagementDetailedDiscoveryData
export type NodeManagementDetailedDiscoveryData = {
    "nodeManagementDetailedDiscoveryData": {
        "specificationVersionList": {
            "specificationVersion": [
                "1.3.0"
            ]
        },
        "deviceInformation": {
            "description": {
                "deviceAddress": {
                    "device": string
                },
                "deviceType": string,
                "networkFeatureSet": string,
                "lastStateChange"?: string
            }
        },
        "entityInformation": {
            "description": {
                "entityAddress": EntityAddress,
                "entityType": EntityType
            }
        }[],
        "featureInformation": {
            "description": FeatureInformationDescription
        }[]
    }
}

type PossibleOperations =
    {
        "read"?: [] | {
            "partial": []
        }
        "write"?: [] | {
            "partial": []
        }
    };

type SupportedFunction<TFunction> = {
    function: TFunction;
    possibleOperations: PossibleOperations | [];
};

type FeatureInformationDescription = {
    "featureAddress": FeatureAddress,
    "description"?: string,
    "role": "client" | "server" | "special",
    "featureType"
} & ({
    "featureType": "NodeManagement",
    "role": "special",
    "supportedFunction": SupportedFunction<"nodeManagementBindingData" | "nodeManagementBindingDeleteCall" | "nodeManagementBindingRequestCall" | "nodeManagementSubscriptionData" | "nodeManagementSubscriptionDeleteCall" | "nodeManagementSubscriptionRequestCall" | "nodeManagementUseCaseData">[]
} | {
    "featureType": "DeviceClassification",
    "role": "server",
    "supportedFunction": SupportedFunction<"deviceClassificationManufacturerData" | "deviceClassificationUserData">[]
} | {
    "featureType": "Generic",
    "role": "client",
    "supportedFunction": undefined
} | {
    "featureType": "ElectricalConnection",
    "role": "server",
    "supportedFunction": SupportedFunction<"electricalConnectionCharacteristicListData" | "electricalConnectionDescriptionListData" | "electricalConnectionParameterDescriptionListData">[]
} | {
    "featureType": "LoadControl",
    "role": "server",
    "supportedFunction": SupportedFunction<"loadControlLimitDescriptionListData" | "loadControlLimitListData">[]
} | {
    "featureType": "Measurement",
    "role": "server",
    "supportedFunction": SupportedFunction<"measurementConstraintsListData" | "measurementDescriptionListData" | "measurementListData">[]
} | {
    "featureType": "DeviceConfiguration",
    "role": "server",
    "supportedFunction": SupportedFunction<"deviceConfigurationKeyValueDescriptionListData" | "deviceConfigurationKeyValueListData">[]
} | {
    "featureType": "DeviceDiagnosis",
    "role": "server",
    "supportedFunction": SupportedFunction<"deviceDiagnosisHeartbeatData">[]
} | {
    "featureType": "SmartEnergyManagementPs",
    "role": "server",
    "supportedFunction": SupportedFunction<"smartEnergyManagementPsData">[]
} | {
    "featureType": "HVAC",
    "role": "server",
    "supportedFunction": SupportedFunction<"hvacOperationModeDescriptionListData" | "hvacSystemFunctionDescriptionListData" | "hvacSystemFunctionSetpointRelationListData" | "hvacSystemFunctionListData" | "hvacSystemFunctionOperationModeRelationListData" | "hvacOverrunDescriptionListData" | "hvacOverrunListData">[]
} | {
    "featureType": "Setpoint",
    "role": "server",
    "supportedFunction": SupportedFunction<"setpointConstraintsListData" | "setpointDescriptionListData" | "setpointListData">[]
});
// #endregion

export type DeviceClassificationManufacturerData = {
    "deviceClassificationManufacturerData": {
        "vendorName": string,
        "brandName": string
    }
}

export type DeviceClassificationUserData = {
    "deviceClassificationUserData": {
        "userLabel": string
    }
}

export type MeasurementListData = {
    "measurementListData": {
        "measurementData": {
            "measurementId": number,
            "valueType": string;
            "value": TValue;
            "valueSource": string;
            "valueState": string;
        }[]
    }
}

export type SetPointListData = {
    "setpointListData": {
        "setpointData":
        {
            "setpointId": number,
            "value": TValue
        }[]
    }
};