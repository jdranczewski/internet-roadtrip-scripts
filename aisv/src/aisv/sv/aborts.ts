class AsyncAbortSignal extends EventTarget {
    aborted = false;
    currentActionPromise;
    reason;

    async protect(callback) {
        if (this.aborted) {
            return;
        }

        const callbackResult = callback();
        this.currentActionPromise = callbackResult instanceof Promise
            ? callbackResult.then(() => { /* no-op */ })
            : Promise.resolve();

        return callbackResult;
    }

    static dummy() {
        const signal = new AsyncAbortSignal();
        signal.protect = () => Promise.resolve();
        return signal;
    }
}

export class AsyncAbortController {
    signal;

    constructor() {
        this.refresh();
    }

    async abort(reason?) {
        this.signal.aborted = true;
        this.signal.reason = reason;
        this.signal.dispatchEvent(new Event('abort'));

        await this.signal.currentActionPromise;
    }

    async refresh() {
        if (this.signal != null) {
            await this.abort();
        }

        this.signal = new AsyncAbortSignal();

        return this;
    }
}

export const changePanoAsyncAbortController = new AsyncAbortController();
export const animatePovAsyncAbortController = new AsyncAbortController();