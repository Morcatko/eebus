export const logIn = (messageType: number, message: string, headerSuffix?: string) => {
    console.log("<<=", `x0${messageType.toString(16)}`, headerSuffix ?? "");
    console.log(message);
    console.log("----------------------");
}

export const logOut = (messageType: number, message: string, headerSuffix?: string) => {
    console.log("=>>", `x0${messageType.toString(16)}`, headerSuffix ?? "");
    if (message) {
        console.log(message);
        console.log("----------------------")
    }
}