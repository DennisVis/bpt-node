/// <reference path='../typings/main.d.ts' />

const pgp = require('pg-promise')({
  // Initialization Options
});

const cn = {
  host: 'localhost',
  port: 5432,
  database: 'bpt',
  user: 'bpt',
  password: '',
  poolSize: 20
};

const db = pgp(cn);

export class DB {
  static client = db;
}
