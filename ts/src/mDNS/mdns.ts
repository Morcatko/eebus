import { Bonjour, Service } from 'bonjour-service'

export class mDNS {
    private readonly bonjour = new Bonjour({ disableIPv6: true})
    private service: Service;


    constructor(
        private readonly ski: string,
        private readonly device_id: string) {
    }

    public init() {
        const customData = {
                textvers: "1",
                id: this.device_id,// "EEBUSJS",
                register: "true",
                path: "/ship/",
                ski: this.ski,
                type: "Controller",
                brand: "Morcatko",
                model: "EEBUS-client"
            };

        this.service = this.bonjour.publish({ 
            name: this.device_id, 
            type: 'ship', 
            port: 50000,
            txt: customData
       });

       console.log("mDNS started");
    }
}