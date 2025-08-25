export class MessageEvent extends Event {
    args: object | undefined;
}

export class Messenger extends EventTarget {
    target: Window;
    targetOrigin: string;

    constructor(target: Window, targetOrigin:string) {
        super();
        this.target = target;
        this.targetOrigin = targetOrigin;
        window.addEventListener("message", (event) => {
            if (event.origin !== this.targetOrigin) return;
            if (event.data?.action) {
                const messageEvent = new MessageEvent(`${event.data.action}`);
                messageEvent.args = event.data.args;
                this.dispatchEvent(messageEvent);
            }
        });
    }

    send(action: string, args?: object) {
        this.target.postMessage(
            { action, args},
            this.targetOrigin
        );
    }
}