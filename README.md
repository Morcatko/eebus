# EEBUS Overview

EEBUS is a protocol for communication between energy-producing and energy-consuming devices over a standard IP network. You can find the official specification on the [EEBUS website](https://www.eebus.org/).

> **EEBUS vs. EBUS**
> Do not confuse EEBUS with EBUS. While some appliances may support both, they are entirely different protocols with no relation to each other.

## Protocol Basics

The EEBUS protocol operates over a secure WebSocket connection, using client certificates for authentication. Data is typically serialized into a JSON format.

Due to the nature of WebSockets, the communication is bidirectional after the connection is established. This means there isn't a strict client-server hierarchy; either party can initiate communication. For example, immediately after a client connects, the server might send a `DetailedDiscovery` request to the client to learn about its capabilities.

## Key Features

EEBUS provides several core functionalities:

-   Read Data: Retrieve data points from a device.
-   Write Data: Send data or commands to a device.
-   **Subscribe to Changes**: The WebSocket connection allows a client to subscribe to data points. The server will then automatically push updates to the client whenever the data changes. This is highly useful for monitoring real-time values like power consumption or temperature without the need for constant polling.
-   **Detailed Discovery**: A client can request `DetailedDiscovery` data from a server. This provides a comprehensive metadata description of all features and data points that can be read from or written to the device.

## Using this Project

To get started, please follow the steps in the [Initial Setup guide](docs/initial_setup.md) to configure your client and connect to an EEBUS-compatible device.
Once your connection works check [How to use the code](/docs/usage.md)




## Projects
 - `./dotnet` - (C#) Client Certificate generator based on [https://github.com/digitaltwinconsortium/EEBUS.Net](https://github.com/digitaltwinconsortium/EEBUS.Net)
  - `./ts` - (typescript) EEBUS client
### Other resources
- [https://www.eebus.org/](https://www.eebus.org/) - Official website
- [https://github.com/enbility/eebus-go](https://github.com/enbility/eebus-go) - Go implementation
- [https://www.openmuc.org/eebus/](https://www.openmuc.org/eebus/) - Java implementation
- [https://github.com/NIBEGroup/openeebus](https://github.com/NIBEGroup/openeebus) - C++ implementation


# Licensing

This implementation is licensed under the **[PolyForm Noncommercial License 1.0.0](./LICENSE.md)**. 

### What this means:
* **Free for Personal Use:** You are free to use, study, and modify this code for personal projects, research, or hobbyist use.
* **No Commercial Usage:** You may not use this code, or any derivative works (forks), for "Commercial Purposes." This includes using it within a for-profit company or building a paid service around it.
* **Forks:** Any fork of this repository must also comply with the Noncommercial restriction. 