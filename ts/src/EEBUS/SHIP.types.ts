//This is far from complete
export type Hello = {
	"connectionHello": {
		"phase": "pending" | "ready";
		"waiting": number;
	};
};

export const format_JSON_UTF8 = "JSON-UTF8";
export type Handshake = {
	"messageProtocolHandshake": {
		"handshakeType": "announceMax" | "select";
		"version": {
			"major": number;
			"minor": number;
		};
		"formats": { "format": string[] };
	};
};

export type AccessMethodsRequest = {
	"accessMethodsRequest": {};
};

export type AccessMethodsResponse = {
	"accessMethods": {
		"id": string;
		"dnsSd_mDns": []; //No idea what it it
	};
};
