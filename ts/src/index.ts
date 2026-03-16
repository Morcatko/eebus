import * as path from 'path';
import { mDNS } from './mDNS/mdns';
import { EEBUSClient } from './EEBUS/EEBUS.client';
import { SHIPClient } from './EEBUS/SHIP.client';
import { SPINEClient } from './EEBUS/SPINE.client';
import { SPINEHelper } from './SPINE.helper';

const target_IP = "192.168.0.68";
const target_PORT = 12480;

const cert_SN = "EEBUS-Client"; //It seems it must be Certificate CN 
const cert_FileName = "EEBUS-Client.pfx";
const cert_SKI = "584101c651d4f960be0be2b200d8b66e1fbca3d2"

const cert_Path = path.resolve(__dirname, cert_FileName);

const eebus = new EEBUSClient(target_IP, target_PORT, cert_Path);
const ship = new SHIPClient(eebus, cert_SN);
const spine = new SPINEClient(eebus);
const sh = new SPINEHelper(spine);

const delay = (timeMs: number) => new Promise(resolve => setTimeout(resolve, timeMs));


const mdns = async () => {
    const mdns = new mDNS(cert_SKI, cert_SN);
    mdns.init();

    await delay(120_000);
}

const readData = async () => {
    try {
        await eebus.connect();
        await eebus.init();
        await ship.init();
        await spine.init();

        await delay(1000);

        //const dd = await sh.detailedDiscoveryData();
        //await sh.readAndSaveAll(dd);

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
readData();