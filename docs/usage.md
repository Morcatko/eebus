Currently the only way how to do something is to change the code in `index.ts` file.
There are several helpers in `SPINE.helper.ts`

use:

- To get all data from your appliance and save it to `./_data` folder
    ```
    const dd = await sh.detailedDiscoveryData();
    await sh.readAndSaveAll(dd);
    ```

- To subscribe to any data (events will be logged into console)
    ```
    await sh.subscribe([entity], feature);
    ```