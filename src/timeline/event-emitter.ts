type EventCallback = (data: any) => void;

export class EventEmitter {
  private _events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    this._events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    if (!this._events.has(event)) return;
    const callbacks = this._events.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event: string, data: any): void {
    if (!this._events.has(event)) return;
    this._events.get(event)!.forEach(callback => callback(data));
  }
} 