const level: LevelUpFactory = require('level');

export type LevelUpFactory = (location: string, options: levelupOptions) => LevelUp;

export class LevelWrapper {
  
  private _level: LevelUp;
  
  constructor(db: LevelUp) {
    this._level = db;
  }

  public get<T>(key: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this._level.get(key, (err, value) => {
        if (err) {
          // If not found, resolve to undefined...
          return err.notFound ? resolve() : reject(err);
        }

        resolve(value);
      });
    });
  }

  public put<T>(key: string, value: T): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._level.put(key, value, (err) => {
        if (err) {
          return reject(err);
        }

        resolve();
      });
    });
  }

  public del(key: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._level.del(key, (err) => {
        if (err) {
          return reject(err);
        }

        resolve();
      });
    });
  }
}