import { Clock } from "../interfaces/clock";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
