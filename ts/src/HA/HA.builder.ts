import * as HA from '@ginden/ha-mqtt-discoverable';

export class HADevice {
    constructor(
        private readonly manager: HA.HaDiscoverableManager,
        private readonly device?: HA.DeviceInfo) {
    }

    public async createDevice(props: {
        name: string,
        id: string
    }) {
        return new HADevice(
            this.manager,
            HA.DeviceInfo.create({
            name: props.name,
            identifiers: [props.id],
            viaDevice: this.device ? this.device.identifiers[0] : undefined,
        }));
    }

    public createNumericSensor(
        props: {
            name: string,
            uniqueIdSuffix: string
            deviceClass?: string,
            unitOfMeasurement?: string
        }) {

        const info = HA.SensorInfo.create({
            device: this.device,
            name: props.name,
            uniqueId: this.device.identifiers[0] + "-" + props.uniqueIdSuffix,
            deviceClass: props.deviceClass,
            stateClass: "measurement",
            valueTemplate: "{{ value| float }}",
            unitOfMeasurement: props.unitOfMeasurement,
        });


        return new HA.Sensor(this.manager, info);
    }

    public createNumber(props: {
        name: string,
        uniqueIdSuffix: string
    }) {
        const info = HA.NumberInfo.create({
            device: this.device,
            name: props.name,
            uniqueId: this.device.identifiers[0] + "-" + props.uniqueIdSuffix,
            min: 0,
            max: 1000000,
            step: 0.5,
        });

        return new HA.Number(info, this.manager);
    }

}