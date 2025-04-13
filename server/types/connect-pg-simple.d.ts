declare module 'connect-pg-simple' {
  import { Store } from 'express-session';
  
  interface Options {
    pool?: any;
    tableName?: string;
    schemaName?: string;
    pgPromise?: any;
    createTableIfMissing?: boolean;
    conString?: string;
    conObject?: object;
    ttl?: number;
    pruneSessionInterval?: boolean | number;
    errorLog?: (error: Error) => void;
  }
  
  function PGSessionInit(options: Store): new (options: Options) => Store;
  
  export = PGSessionInit;
}