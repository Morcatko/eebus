// types.ts
export interface SpineHeader {
  specificationVersion: "1.3.0";
  addressSource: { device: string; entity: number[]; feature: number };
  addressDestination: { device: string; entity: number[]; feature: number };
  msgCounter: number;
}

export interface SpinePayload {
  cmd: {
    function: string; // e.g., "measurementData"
    filter?: any;
    data?: any;
  };
}

export interface SpineDatagram {
  header: SpineHeader;
  payload: SpinePayload;
}