import { connect } from 'mqtt';
import * as HA from '@ginden/ha-mqtt-discoverable';
import { HADevice } from './HA.builder';

export class HAClient {
    private manager: HA.HaDiscoverableManager;

    constructor(private readonly mqtt_ip: string) {
    }

    public async init() {
        const client = await connect(`mqtt://${this.mqtt_ip}:1883`);
        this.manager = HA.HaDiscoverableManager.withSettings({
            client
        });
    }

    public createDevice(props: Parameters<typeof HADevice.prototype.createDevice>[0]) {
        return (new HADevice(this.manager, null)).createDevice(props);
    }
} 