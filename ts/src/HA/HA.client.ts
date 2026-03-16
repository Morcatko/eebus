import { connect } from 'mqtt';
import * as HA from '@ginden/ha-mqtt-discoverable';

export class HAClient {
    private manager: HA.HaDiscoverableManager;
    private device: HA.DeviceInfo;

    constructor(private readonly mqtt_ip: string) {
    }

    public async init() {
        const client = await connect(`mqtt://${this.mqtt_ip}:1883`);
        this.manager = HA.HaDiscoverableManager.withSettings({
            client
        });

        this.device = HA.DeviceInfo.create({
            name: 'Fake deviceXX',
            identifiers: ['fake-device-XX'],
        });
    }

    public getDevice() {
        return this.device;
    }

    public async test() {

        const device2 = HA.DeviceInfo.create({
            name: 'Fake device 2',
            identifiers: ['fake-device-2'],
            viaDevice: this.device.identifiers[0],
        });

        const numberInfo2 = HA.NumberInfo.create({
            device: device2,
            name: 'Fake number 2',
            uniqueId: 'fake-number-2',
        });
        const number2 = new HA.Number(numberInfo2, this.manager);
        await number2.setValue(48);
    }

    public createNumericSensor(
        props: {
            device: HA.DeviceInfo,
            name: string,
            uniqueId: string
            deviceClass?: string,
            unitOfMeasurement?: string
        }) {

        const info = HA.SensorInfo.create({
            device: props.device,
            name: props.name,
            uniqueId: props.uniqueId,
            deviceClass: props.deviceClass,
            stateClass: "measurement",
            valueTemplate: "{{ value| float }}",
            unitOfMeasurement: props.unitOfMeasurement,
        });


        return new HA.Sensor(this.manager, info);
    }

    public createNumber(
        props: {
            device: HA.DeviceInfo,
            name: string,
            uniqueId: string
            min: number,
            max: number
        }) {

        const info = HA.NumberInfo.create({
            device: props.device,
            name: props.name,
            uniqueId: props.uniqueId,
            min: props.min,
            max: props.max,
            commandTopic: ``
        });


        return new HA.Number(info, this.manager);
    }

    public async sendPower(value: number) {
        const device1 = HA.DeviceInfo.create({
            name: 'Fake device',
            identifiers: ['fake-device'],
        });


        const numberInfo1 = HA.NumberInfo.create({
            device: device1,
            name: 'Fake number',
            uniqueId: 'fake-number',
            min: -10000,
            max: 100000,
        });
        const number1 = new HA.Number(numberInfo1, this.manager);
        await number1.setValue(value);
    }

} 