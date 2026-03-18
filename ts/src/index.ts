import * as fs from 'node:fs';
import * as path from 'node:path';
import { mDNS } from './mDNS/mdns';
import { EEBUSClient } from './EEBUS/EEBUS.client';
import { SHIPClient } from './EEBUS/SHIP.client';
import { SPINEClient } from './EEBUS/SPINE.client';
import { SPINEHelper } from './SPINE.helper';
import { HAClient } from './HA/HA.client';
import { Number, Sensor } from '@ginden/ha-mqtt-discoverable';

const mqtt_ip = "192.168.0.15";
const target_IP = "192.168.0.68";
const target_PORT = 12480;

const cert_SN = "EEBUS-Client"; //It seems it must be Certificate CN 
const cert_FileName = "EEBUS-Client.pfx";
const cert_SKI = "584101c651d4f960be0be2b200d8b66e1fbca3d2"

const eebus = new EEBUSClient(target_IP, target_PORT, {
    pfx: fs.readFileSync(path.resolve(__dirname, cert_FileName)),
    //passphrase: '',
    rejectUnauthorized: false, // For local dev/testing only!
});

const ship = new SHIPClient(eebus, cert_SN);
const spine = new SPINEClient(eebus);
const sh = new SPINEHelper(spine);
const ha = new HAClient(mqtt_ip);

const delay = (timeMs: number) => new Promise(resolve => setTimeout(resolve, timeMs));


const mdns = async () => {
    const mdns = new mDNS(cert_SKI, cert_SN);
    mdns.init();

    await delay(120_000);
}

const main = async () => {
    try {
        await eebus.connect();
        await eebus.init();
        await ship.init();
        await spine.init();

        await ha.init();

        await delay(1000);

        const sub_measurement = async (
            entity: number[],
            feature: number,
            measuementId: number,
            haSensor: Sensor) => {
            sh.readAndSubscribeMeasurement(entity, feature, measuementId, (value) => {
                console.log(`${entity.join(", ")}, ${feature}: `, 1 * value);
                haSensor.updateState(1 * value);
            });
        }

        const sub_setpoint = async (
            entity: number[],
            feature: number,
            setpointId: number,
            haNumber: Number) => {
            sh.readAndSubscribeSetpoint(entity, feature, setpointId, (value) => {
                console.log(`${entity.join(", ")}, ${feature}: `, 1 * value);
                haNumber.setValue(1 * value);
            });

            haNumber.withCommand((j) => 
                sh.writeSetpoint([5, 1, 1], 18, 1, j as number));
        }

        const device_Vaillant_0 = await ha.createDevice({
            name: "Vaillant via EEBUS",
            id: "vaillant-eebus"
        });

        /*const device_3_Vaillant_HeatPump = await device_Vaillant_0.createDevice({
            name: "Vaillant Heat Pump",
            id: "vaillant-eebus-3.11"
        });

        const device_3_1_Vaillant_Compressor = await device_3_Vaillant_HeatPump.createDevice({
            name: "Vaillant Compressor",
            id: "vaillant-eebus-3.1-11"
        });
        
        const device_4_Vaillant_DHW = await device_Vaillant_0.createDevice({
            name: "Vaillant DHW",
            id: "vaillant-eebus-4"
        });*/

        const sensor_3_11_HeatPump_power = await device_Vaillant_0.createNumericSensor({
            name: "HeatPump power",
            uniqueIdSuffix: "heatpump-power",
            deviceClass: "power",
            unitOfMeasurement: "W"
        });

        const sensor_3_1_11_Compressor_power = await device_Vaillant_0.createNumericSensor({
            name: "Compressor power",
            uniqueIdSuffix: "compressor-power",
            deviceClass: "power",
            unitOfMeasurement: "W"
        });

        const sensor_4_11DHW_temp = await device_Vaillant_0.createNumericSensor(
            {
                name: "DHW temp",
                uniqueIdSuffix: "dhw-temp",
                deviceClass: "temperature",
                unitOfMeasurement: "°C"
            });

        const sensor_5_1_1_Room_temp = await device_Vaillant_0.createNumericSensor({
            name: "Room temp",
            uniqueIdSuffix: "room-temp",
            deviceClass: "temperature",
            unitOfMeasurement: "°C"
        });

        const sensor_6_11_Outside_temp = await device_Vaillant_0.createNumericSensor({
            name: "Outside temp",
            uniqueIdSuffix: "outside-temp",
            deviceClass: "temperature",
            unitOfMeasurement: "°C"
        })

        await sub_measurement([3], 11, 0, sensor_3_11_HeatPump_power);
        await sub_measurement([3, 1], 11, 9, sensor_3_1_11_Compressor_power);
        await sub_measurement([4], 11, 0, sensor_4_11DHW_temp);
        await sub_measurement([5, 1, 1], 11, 0, sensor_5_1_1_Room_temp);
        await sub_measurement([6], 11, 0, sensor_6_11_Outside_temp);


        const number_5_1_1_Room_temp = await device_Vaillant_0.createNumber({
            name: "Vaillant Room temp",
            uniqueIdSuffix: "room-temp-setpoint"
        });

        await sub_setpoint([5, 1, 1], 18, 1, number_5_1_1_Room_temp);


        //const dd = await sh.detailedDiscoveryData();
        //await sh.readAndSaveAll(dd);

        const writeRoomTemp = async () => {
            const result = await spine.sendWriteCmd([5, 1, 1], 18, {
                "setpointListData": {
                    "setpointData": [
                        {
                            "setpointId": 1,
                            "value": {
                                "number": 24
                            }
                        }
                    ]
                }
            });

            console.log("result", result);
        }

        //await sh.useCaseData();


        /*await sh.readAndPrint([3], 7, "electricalConnectionCharacteristicListData");
        await sh.readAndPrint([3], 7,"electricalConnectionDescriptionListData");
        await sh.readAndPrint([3], 7,"electricalConnectionParameterDescriptionListData");
        await sh.readAndPrint([3, 1], 7,"electricalConnectionDescriptionListData");
        await sh.readAndPrint([3, 1], 7,"electricalConnectionParameterDescriptionListData");*/

        /*await sh.readAndPrint([3], 11, "measurementConstraintsListData");
        await sh.readAndPrint([3], 11, "measurementDescriptionListData");
        await sh.readAndPrint([3], 11, "measurementListData");*/

        /*await sh.readFunction([4], 11, "measurementConstraintsListData");
        await sh.readFunction([4], 11, "measurementDescriptionListData");
        await sh.readFunction([4], 11, "measurementListData");
         
        await sh.readFunction([3, 1], 11, "measurementConstraintsListData");
        await sh.readFunction([3, 1], 11, "measurementDescriptionListData");
        await sh.readFunction([3, 1], 11, "measurementListData");
         
        await sh.readFunction([5, 1, 1], 11, "measurementConstraintsListData");
        await sh.readFunction([5, 1, 1], 11, "measurementDescriptionListData");
        await sh.readFunction([5, 1, 1], 11, "measurementListData");*/

        /*await sh.readFunction([6], 11, "measurementConstraintsListData");
        await sh.readFunction([6], 11, "measurementDescriptionListData");
        await sh.readFunction([6], 11, "measurementListData");*/

        //await sh.readAndSave([3], 7, "electricalConnectionCharacteristicListData");
        //await sh.readAndSave_functions([4], 9, ["hvacOperationModeDescriptionListData", "hvacSystemFunctionDescriptionListData", "hvacSystemFunctionSetpointRelationListData", "hvacSystemFunctionListData", "hvacSystemFunctionOperationModeRelationListData", "hvacOverrunDescriptionListData", "hvacOverrunListData"]);
        //await sh.readAndSave_functions([5, 1, 1 ], 9, ["hvacOperationModeDescriptionListData", "hvacSystemFunctionDescriptionListData", "hvacSystemFunctionSetpointRelationListData", "hvacSystemFunctionListData", "hvacSystemFunctionOperationModeRelationListData"]);
        //await sh.readAndSave_functions([0], 1, ["deviceClassificationManufacturerData"]);
        //await sh.readAndSave_functions([3], 4, ["deviceClassificationManufacturerData"]);
        //await sh.readAndSave_functions([5], 4, ["deviceClassificationUserData"]);
        //await sh.readAndSave_functions([5, 1], 4, ["deviceClassificationUserData"]);
        //await sh.readAndSave_functions([5, 1, 1], 4, ["deviceClassificationUserData"]);*/
        //await sh.readAndSave_functions([3], 10, ["loadControlLimitDescriptionListData", "loadControlLimitListData"]);
        //await sh.readAndSave_functions([3], 24, ["deviceConfigurationKeyValueDescriptionListData", "deviceConfigurationKeyValueListData"]);
        //await sh.readAndSave_functions([3], 1000, ["deviceDiagnosisHeartbeatData", "deviceDiagnosisStateData"]);
        //await sh.readAndSave_functions([3, 1], 19, ["smartEnergyManagementPsData"])

        // await sh.subscribe([3], 11);
        // await sh.subscribe([3, 1], 11);
        // await sh.subscribe([4], 11);           //DHW temp
        // await sh.subscribe([5, 1, 1], 11);
        // await sh.subscribe([6], 11)            //outside-temp



    } catch (e) {
        console.error(e);
    }
}


//mdns();
main();