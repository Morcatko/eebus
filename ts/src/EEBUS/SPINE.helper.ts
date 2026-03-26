import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SPINEClient } from "./SPINE.client";
import * as SPINE from "./SPINE.types";

export class SPINEHelper {
	constructor(readonly spineClient: SPINEClient) {}

	public async init() {
	}


	public async readAndSave<TResponse>(entity: number[], feature: number, readFunction: string) {
		const result = await this.spineClient.readFunction<TResponse>(entity, feature, readFunction);
		const jsonData = JSON.stringify(result, null, 2);

		const filePath = `../_data/${entity.join(".")}-${feature} ${readFunction}.json`;
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, jsonData, "utf-8");

		return result;
	}

	public async readAndPrint<TResponse>(entity: number[], feature: number, readFunction: string) {
		const result = await this.spineClient.readFunction<TResponse>(entity, feature, readFunction);
		console.log("----------------- ", entity.join(".") + "-" + feature, readFunction, "-----------------");
		console.log(JSON.stringify(result));
		console.log("------------------------------------------");
		return result;
	}

	public subscribe(entity: number[], feature: number) {
		this.spineClient.subscribe(entity, feature, (p) => {
			console.log("Notify", entity, feature);
			console.log(JSON.stringify(p));
			console.log("==================");
		});
	}

	/*private async subscribe_stream<TPayload = SPINE.Payload>(entity: number[], feature: number) {
        return await streamToAsyncGenerator<any>(async (onMessage: (msg: any) => void, onEnd: () => void, onError: (err: Error) => void) => {
            const unsubscribe = this.subscribe(entity, feature, onMessage);
            return unsubscribe;
        })
    }*/

	public async readAndSave_functions(entity: number[], feature: number, functions: string[]) {
		for (const f of functions) {
			await this.readAndSave(entity, feature, f);
		}
	}

	public async readAndSubscribeMeasurement(
		entity: number[],
		feature: number,
		measurementId: number,
		onValue: (value: number) => void,
	) {
		const processData = (p: SPINE.MeasurementListData) => {
			const value = p
				.measurementListData
				.measurementData
				.find((m) => m.measurementId === measurementId)
				.value;

			const numericValue = value.number * Math.pow(10, value.scale ?? 0);
			onValue(numericValue);
		};

		const result = await this.spineClient.readFunction<SPINE.MeasurementListData>(entity, feature, "measurementListData");
		processData(result);
		await this.spineClient.subscribe(entity, feature, processData);
	}

	public async readAndSubscribeSetpoint(
		entity: number[],
		feature: number,
		setpointId: number,
		onValue: (value: number) => void,
	) {
		const processData = (p: SPINE.SetpointListData) => {
			const value = p
				.setpointListData
				.setpointData
				.find((m) => m.setpointId === setpointId)
				.value;

			const numericValue = value.number * Math.pow(10, value.scale ?? 0);
			onValue(numericValue);
		};

		const result = await this.spineClient.readFunction<SPINE.SetpointListData>(entity, feature, "setpointListData");
		processData(result);
		await this.spineClient.subscribe(entity, feature, processData);
	}

	public async writeSetpoint(entity: number[], feature: number, setpointId: number, value: number) {
		const result = await this.spineClient.sendWriteCmd(entity, feature, {
			"setpointListData": {
				"setpointData": [
					{
						"setpointId": setpointId,
						"value": {
							"number": value,
						},
					},
				],
			},
		});

		return result;
	}

	public async detailedDiscoveryData() {
		const reply = await this.readAndSave<SPINE.NodeManagementDetailedDiscoveryData>([0], 0, "nodeManagementDetailedDiscoveryData");
		const dd = reply.nodeManagementDetailedDiscoveryData;
		console.log("======== Discovery Data =========");
		console.log("  Device    :", dd.deviceInformation.description.deviceType);
		console.log("  Entities  :");
		dd
			.entityInformation
			.forEach((ei) => console.log("    ", ei.description.entityAddress.entity, ei.description.entityType));
		console.log("  Features  :");
		dd
			.featureInformation
			.forEach((fi) =>
				console.log(
					"    ",
					fi.description.featureAddress.entity,
					fi.description.featureAddress.feature,
					fi.description.featureType,
					" - ",
					"[" + (fi.description.supportedFunction?.map((sf) => `"${sf.function}"`).join(", ") ?? "__none__") + "]",
				)
			);
		console.log("=================================");
		return dd;
	}

	public async useCaseData() {
		this.readAndSave<SPINE.NodeManagementDetailedDiscoveryData>([0], 0, "nodeManagementUseCaseData");
	}

	public async readAndSaveAll(detailedDiscovery: Awaited<ReturnType<typeof this.detailedDiscoveryData>>) {
		for (const fi of detailedDiscovery.featureInformation) {
			if (fi.description.role === "client") {
				continue;
			}

			for (const f of fi.description.supportedFunction) {
				if (f.possibleOperations["read"] !== undefined) {
					await this.readAndSave(
						fi.description.featureAddress.entity,
						fi.description.featureAddress.feature,
						f.function,
					);
				}
			}
		}
		console.log("=============== readAndSaveAll completed ============");
	}
}
