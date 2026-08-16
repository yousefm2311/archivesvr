declare module "mssql" {
  namespace sql {
    type ConnectionPool = any;
    type config = any;
    const VarChar: any;
    function connect(config: config): Promise<ConnectionPool>;
  }

  export = sql;
}
